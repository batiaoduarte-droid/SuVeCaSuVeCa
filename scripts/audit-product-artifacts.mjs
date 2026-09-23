import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyArtifact, ArtifactIntegrityError } from './lib/release-integrity.mjs';

const manifest = JSON.parse(fs.readFileSync('product-artifacts.manifest.json', 'utf8'));
if (manifest.schemaVersion !== 1 || !manifest.artifacts?.length) throw new Error('Invalid product artifact manifest');
const files = new Set();
const failures = [];
// Count the deliverable tree, including new files and excluding tracked files
// intentionally removed in this migration. Exported source archives need no Git.
let repositoryFiles;
let fileCountMode = 'git-candidates';
try {
  const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  if (path.resolve(gitRoot) !== path.resolve('.')) throw new Error('Different Git root');
  repositoryFiles = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(file => file && fs.existsSync(file) && fs.statSync(file).isFile()))];
} catch {
  fileCountMode = 'source-archive';
  const ignored = new Set(['.git', 'node_modules', 'dist', 'server-dist', 'release', 'coverage', '.vite', '.firebase', '.auditorias', 'playwright-report', 'test-results', 'scratch', 'qa']);
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name) || entry.name.startsWith('.tmp-') || entry.name.endsWith('.log')) return [];
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
  });
  repositoryFiles = walk('.');
}
if (repositoryFiles.length >= 1000) failures.push({ cause: 'file-budget', message: `${repositoryFiles.length} files; delivery requires fewer than 1000.` });
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
  repositoryFiles: repositoryFiles.length,
  fileCountMode,
};
if (failures.length) {
  console.error(JSON.stringify({ ...summary, status: 'error', failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(summary));

for (const file of ["public/knowledge/official-questions.raw.json", "public/knowledge/official-questions.normalized.json", "public/knowledge/pbl/question_competency_links.json", "public/knowledge/pbl/question_pedagogy_index.json"]) {
  if (fs.existsSync(file)) throw new Error(`Retired aggregate returned to product: ${file}`);
}
