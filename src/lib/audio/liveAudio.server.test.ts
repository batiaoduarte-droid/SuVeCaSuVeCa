// @vitest-environment node
import { createServer } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { describe, expect, it, vi } from 'vitest';
import { attachLiveAudio, LiveTickets } from './liveAudio.server';

describe('Live authentication and transport', () => {
  it('expires tickets, invalidates previous tickets and prevents replay', () => {
    const tickets = new LiveTickets();
    const old = tickets.issue('alice', 100);
    const fresh = tickets.issue('alice', 200);
    expect(tickets.consume(old, 300)).toBeUndefined();
    expect(tickets.consume(fresh, 300)).toBe('alice');
    expect(tickets.consume(fresh, 301)).toBeUndefined();
    expect(tickets.consume(tickets.issue('bob', 100), 30100)).toBeUndefined();
  });
  it('rejects unauthenticated upgrades before provider calls and accepts only bounded PCM/text', async () => {
    const server = createServer(); const tickets = new LiveTickets();
    const session = { sendRealtimeInput: vi.fn(), close: vi.fn() };
    const provider = vi.fn(async () => session);
    const wss = attachLiveAudio(server, tickets, provider);
    server.listen(0, '127.0.0.1'); await once(server, 'listening');
    const host = `127.0.0.1:${(server.address() as { port: number }).port}`;
    const clients: WebSocket[] = [];
    try {
      const denied = new WebSocket(`ws://${host}/api/gemini/live`, { origin: `http://${host}` }); clients.push(denied);
      const [error] = await once(denied, 'error'); expect(String(error)).toContain('401'); expect(provider).not.toHaveBeenCalled();
      const evil = new WebSocket(`ws://${host}/api/gemini/live?ticket=${tickets.issue('alice')}`, { origin: 'https://other.example' }); clients.push(evil);
      await once(evil, 'error'); expect(provider).not.toHaveBeenCalled();
      const client = new WebSocket(`ws://${host}/api/gemini/live?ticket=${tickets.issue('alice')}`, { origin: `http://${host}` }); clients.push(client);
      const [ready] = await once(client, 'message'); expect(JSON.parse(ready.toString()).type).toBe('ready');
      client.send(JSON.stringify({ type: 'audio', data: 'AAAAAA==' }));
      await vi.waitFor(() => expect(session.sendRealtimeInput).toHaveBeenCalledWith({ audio: { data: 'AAAAAA==', mimeType: 'audio/pcm;rate=16000' } }));
      const closed = once(client, 'close'); client.send(JSON.stringify({ type: 'audio', data: 'bad-pcm' })); await closed;
      expect(session.close).toHaveBeenCalledTimes(1);
      provider.mockImplementationOnce(() => { throw new Error('Provider configuration unavailable'); });
      const unavailable = new WebSocket(`ws://${host}/api/gemini/live?ticket=${tickets.issue('alice')}`, { origin: `http://${host}` }); clients.push(unavailable);
      const unavailableClosed = once(unavailable, 'close');
      const [failure] = await once(unavailable, 'message');
      expect(JSON.parse(failure.toString())).toMatchObject({ type: 'error' });
      await unavailableClosed;
    } finally {
      for (const client of clients) client.terminate();
      for (const client of wss.clients) client.terminate();
      wss.close(); await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
