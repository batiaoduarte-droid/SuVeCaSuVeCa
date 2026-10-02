// @vitest-environment node
import express from 'express';
import { once } from 'node:events';
import { expect, it } from 'vitest';
import { configureJsonBodies } from './httpBody.server';

it('accepts saved PBL conversations over 32 KB and returns JSON for oversized requests', async () => {
  const app = express();
  configureJsonBodies(app);
  app.post('*', (req, res) => res.json({ length: req.body.text.length }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  const send = (path: string, size: number) => fetch(`http://127.0.0.1:${port}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(size) }),
  });
  try {
    expect((await send('/api/pbl/session/sync', 300_000)).status).toBe(200);
    expect((await send('/api/pbl/tutor/turn', 60_000)).status).toBe(200);
    expect((await send('/api/gemini/explain', 60_000)).status).toBe(200);
    const oversized = await send('/api/pbl/session/sync', 1_100_000);
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toMatchObject({ code: 'REQUEST_TOO_LARGE', retryable: false });
    expect((await send('/api/other', 60_000)).status).toBe(413);
  } finally {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
