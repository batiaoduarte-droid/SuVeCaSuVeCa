import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';
const root = path.resolve('release');
await fs.mkdir(root, { recursive: true });
// A new directory prevents stale files from previous deliveries entering the package.
const destination = await fs.mkdtemp(path.join(root, 'suveca-'));
for (const name of ['dist', 'server-dist', 'server-data']) await fs.cp(name, path.join(destination, name), { recursive: true });
const source = JSON.parse(await fs.readFile('package.json', 'utf8'));
const dependencies = Object.fromEntries(['@google/genai', 'dotenv', 'express', 'firebase-admin', 'ws'].map(name => [name, source.dependencies[name]]));
await fs.writeFile(path.join(destination, 'package.json'), JSON.stringify({ name: 'suveca-production', private: true, type: 'commonjs', engines: source.engines, scripts: { start: 'node server-dist/server.cjs' }, dependencies }, null, 2));
await fs.writeFile(path.join(destination, 'start.cjs'), "process.env.NODE_ENV = 'production'; require('./server-dist/server.cjs');\n");
const pkg = JSON.parse(await fs.readFile(path.join(destination, 'package.json'), 'utf8')); pkg.scripts.start = 'node start.cjs';
await fs.writeFile(path.join(destination, 'package.json'), JSON.stringify(pkg, null, 2));
const inventory = [];
async function visit(directory) {
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) { await visit(file); continue; }
    const bytes = await fs.readFile(file);
    inventory.push({ file: path.relative(destination, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    if (file.startsWith(path.join(destination, 'dist') + path.sep) && /\.(js|css|html|json|svg|webmanifest)$/.test(file)) {
      await fs.writeFile(file + '.gz', gzipSync(bytes, { level: 9 }));
      await fs.writeFile(file + '.br', brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 6 } }));
    }
  }
}
await visit(destination);
await fs.writeFile(path.join(destination, 'delivery-manifest.json'), JSON.stringify({ deliveryVersion: 1, inventory }));
console.log(destination);
