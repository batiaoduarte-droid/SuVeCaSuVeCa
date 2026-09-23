import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
const root = path.resolve(process.argv[2] || '.');
const port = process.env.SUVECA_SMOKE_PORT || '3191';
const base = `http://127.0.0.1:${port}`;
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^GEMINI_API_KEY/i.test(key)));
const child = spawn(process.execPath, ['server-dist/server.cjs'], { cwd: root, env: { ...env, NODE_ENV: 'production', PORT: port, PBL_TUTOR_ENABLED: 'false' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', value => { output += value; }); child.stderr.on('data', value => { output += value; });
try {
  let ready = false;
  for (let i = 0; i < 300; i++) {
    if (child.exitCode !== null) throw new Error('Compiled server failed to start: ' + output);
    try { const response = await fetch(base + '/api/health'); ready = response.ok; } catch { /* Wait for listen. */ }
    if (ready) break; await setTimeout(100);
  }
  assert.ok(ready, 'Production server did not become ready');
  const health = await fetch(base + '/api/knowledge/health'); assert.equal(health.status, 200);
  const searchResponse = await fetch(base + '/api/knowledge/questions?query=crase&limit=1'); assert.equal(searchResponse.status, 200);
  const search = await searchResponse.json(); assert.ok(search.total > 0);
  const id = search.items[0].questionId;
  const practice = await (await fetch(base + '/api/knowledge/questions/' + encodeURIComponent(id) + '?projection=practice')).json();
  assert.ok(practice.editorial.normalized); assert.ok(!('raw' in practice.editorial));
  const complete = await (await fetch(base + '/api/knowledge/questions/' + encodeURIComponent(id))).json(); assert.ok(complete.editorial.raw);
  const unauthorized = await fetch(base + '/api/suveca/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sentence: 'Verificação de acesso.' }) });
  assert.equal(unauthorized.status, 401);
  assert.equal((await fetch(base + '/knowledge/pbl/tutor/pbl_tutor_manifest.json')).status, 404);
  assert.equal((await fetch(base + '/knowledge/missing-fragment.json')).status, 404);
  const manifest = await fetch(base + '/knowledge/official-questions.manifest.json'); assert.equal(manifest.headers.get('cache-control'), 'no-cache');
  const htmlResponse = await fetch(base + '/'); const html = await htmlResponse.text(); assert.equal(htmlResponse.headers.get('cache-control'), 'no-cache');
  const asset = /(?:src|href)="(\/assets\/[^" ]+\.js)"/.exec(html)?.[1]; assert.ok(asset);
  const js = await fetch(base + asset); assert.match(js.headers.get('cache-control'), /immutable/);
  assert.ok(!(await fs.readdir(path.join(root, 'dist/knowledge/pbl'))).includes('tutor'));
  if (await fs.access(path.join(root, 'delivery-manifest.json')).then(() => true, () => false)) {
    const compressed = await fetch(base + asset, { headers: { 'accept-encoding': 'br' } });
    assert.equal(compressed.headers.get('content-encoding'), 'br'); assert.ok((await compressed.text()).length > 0);
  }
  console.log(JSON.stringify({ status: 'PRODUCTION_SMOKE_PASSED', root, authenticatedRoutesFailClosed: true, privateTutorNotStatic: true, searchAndPracticeProjection: true, immutableHashedAssets: true }));
} finally { child.kill(); }
