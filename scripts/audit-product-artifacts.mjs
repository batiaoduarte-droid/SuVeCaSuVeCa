import fs from 'node:fs';
import { verifyArtifact, ArtifactIntegrityError } from './lib/release-integrity.mjs';

const manifest = JSON.parse(fs.readFileSync('product-artifacts.manifest.json', 'utf8'));
if (manifest.schemaVersion !== 1 || !manifest.artifacts?.length) throw new Error('Invalid product artifact manifest');
const files = new Set();
const failures = [];
let totalBytes = 0;
let largest = { file: '', bytes: 0 };
for (const descriptor of manifest.artifacts) {
  if (files.has(descriptor.file)) throw new Error(`Duplicate artifact: ${descriptor.file}`);
  files.add(descriptor.file);
  totalBytes += descriptor.bytes;
  if (descriptor.bytes > largest.bytes) largest = { file: descriptor.file, bytes: descriptor.bytes };
  try {
    verifyArtifact(process.cwd(), descriptor);
  } catch (error) {
    const cause = error instanceof ArtifactIntegrityError ? error.cause : 'invalid-descriptor';
    failures.push({ cause, file: descriptor.file, expectedBytes: descriptor.bytes, message: error.message });
  }
}
// Self-describing delivery: an importer can detect a truncated import by comparing
// these counters with the imported tree, without regenerating anything.
if (Number.isSafeInteger(manifest.totalBytes) && manifest.totalBytes !== totalBytes) {
  failures.push({ cause: 'inventory-drift', file: 'product-artifacts.manifest.json', message: `manifest totalBytes ${manifest.totalBytes} != computed ${totalBytes}` });
}
const summary = {
  status: failures.length ? 'error' : 'ok',
  publishedArtifacts: files.size,
  totalBytes,
  largestArtifact: largest,
};
if (failures.length) {
  console.error(JSON.stringify({ ...summary, status: 'error', failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary));
