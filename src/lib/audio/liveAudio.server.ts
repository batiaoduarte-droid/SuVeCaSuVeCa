import { randomBytes } from 'node:crypto';
import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

export class LiveTickets {
  private tickets = new Map<string, { userId: string; expires: number }>();
  issue(userId: string, now = Date.now()) {
    for (const [key, value] of this.tickets) if (value.expires <= now || value.userId === userId) this.tickets.delete(key);
    if (this.tickets.size >= 2000) throw new Error('LIVE_CAPACITY');
    const ticket = randomBytes(32).toString('hex');
    this.tickets.set(ticket, { userId, expires: now + 30_000 });
    return ticket;
  }
  consume(ticket: string, now = Date.now()): string | undefined {
    const value = this.tickets.get(ticket);
    this.tickets.delete(ticket);
    return value && value.expires > now ? value.userId : undefined;
  }
}

export interface LiveSession {
  sendRealtimeInput(input: { audio?: { data: string; mimeType: string }; text?: string }): void;
  close(): void;
}
export type OpenLiveSession = (callbacks: { onmessage: (value: unknown) => void; onerror: () => void; onclose: () => void }) => Promise<LiveSession>;

/** HTTP middleware does not authenticate upgrades. Require a single-use ticket issued by the authenticated HTTP route. */
export function attachLiveAudio(server: Server, tickets: LiveTickets, openSession: OpenLiveSession,
  onFinished?: (userId: string, startedAt: number, failed: boolean) => void) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 48 * 1024 });
  const active = new Map<string, number>();
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', 'http://localhost');
    if (url.pathname !== '/api/gemini/live') return; // Vite owns its HMR upgrade.
    let originMatches = false;
    try { originMatches = new URL(request.headers.origin || '').host === request.headers.host; } catch { /* reject */ }
    const userId = originMatches ? tickets.consume(url.searchParams.get('ticket') || '') : undefined;
    if (!userId || (active.get(userId) || 0) >= 1) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
      return;
    }
    active.set(userId, 1);
    // ws can reject malformed handshake headers without throwing or calling back.
    const releaseHandshake = () => active.delete(userId);
    socket.once('close', releaseHandshake);
    try {
      sockets.handleUpgrade(request, socket, head, ws => {
        socket.removeListener('close', releaseHandshake);
        sockets.emit('connection', ws, userId);
      });
    } catch { active.delete(userId); socket.destroy(); }
  });
  sockets.on('connection', (ws: WebSocket, userId: string) => {
    const startedAt = Date.now();
    let session: LiveSession | undefined;
    let closed = false;
    let failed = false;
    let alive = true;
    let bucketStart = Date.now();
    let packets = 0;
    let bytes = 0;
    const send = (value: unknown) => {
      if (closed || ws.readyState !== WebSocket.OPEN) return;
      if (ws.bufferedAmount > 1_000_000) { fail(); return; }
      ws.send(JSON.stringify(value));
    };
    const fail = () => { failed = true; sendError(); ws.close(1008, 'Sessão de voz encerrada'); };
    const sendError = () => {
      if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 1_000_000) ws.send(JSON.stringify({ type: 'error', message: 'Não foi possível manter a sessão de voz. Tente novamente.' }));
    };
    const heartbeat = setInterval(() => { if (!alive) { ws.terminate(); return; } alive = false; ws.ping(); }, 25_000);
    const deadline = setTimeout(() => ws.close(1000, 'Limite de 10 minutos atingido'), 600_000);
    const setupTimeout = setTimeout(fail, 25_000);
    ws.on('pong', () => { alive = true; });
    ws.on('close', () => {
      closed = true; active.delete(userId);
      clearInterval(heartbeat); clearTimeout(deadline); clearTimeout(setupTimeout);
      try { session?.close(); } catch { /* provider already closed */ }
      onFinished?.(userId, startedAt, failed);
    });
    ws.on('error', () => { failed = true; ws.terminate(); });
    ws.on('message', (data, binary) => {
      try {
        if (!session || closed || binary) { fail(); return; }
        if (Date.now() - bucketStart >= 1000) { bucketStart = Date.now(); packets = 0; bytes = 0; }
        bytes += data.toString().length;
        if (++packets > 70 || bytes > 180_000) { fail(); return; }
        const input = JSON.parse(data.toString());
        if (input.type === 'audio' && typeof input.data === 'string' && input.data.length <= 44_000
          && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data)
          && Buffer.from(input.data, 'base64').length > 0 && Buffer.from(input.data, 'base64').length % 2 === 0) {
          session.sendRealtimeInput({ audio: { data: input.data, mimeType: 'audio/pcm;rate=16000' } });
        } else if (input.type === 'text' && typeof input.text === 'string' && input.text.trim() && input.text.length <= 4000) {
          session.sendRealtimeInput({ text: input.text });
        } else { fail(); }
      } catch { fail(); }
    });
    void Promise.resolve().then(() => openSession({ onmessage: send, onerror: fail, onclose: () => ws.close() })).then(value => {
      clearTimeout(setupTimeout);
      if (closed || ws.readyState !== WebSocket.OPEN) { value.close(); return; }
      session = value; send({ type: 'ready' });
    }).catch(fail);
  });
  return sockets;
}
