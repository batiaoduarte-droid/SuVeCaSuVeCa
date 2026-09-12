import fs from 'node:fs';
import { verifyArtifact } from './lib/release-integrity.mjs';

const manifest = JSON.parse(fs.readFileSync('product-artifacts.manifest.json', 'utf8'));
if (manifest.schemaVersion !== 1 || !manifest.artifacts?.length) throw new Error('Invalid product artifact manifest');
const files = new Set();
for (const descriptor of manifest.artifacts) {
  if (files.has(descriptor.file)) throw new Error(`Duplicate artifact: ${descriptor.file}`);
  files.add(descriptor.file);
  verifyArtifact(process.cwd(), descriptor);
}
console.log(JSON.stringify({ status: 'ok', publishedArtifacts: files.size }));
