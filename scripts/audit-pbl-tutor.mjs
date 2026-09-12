import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { verifyArtifact } from './lib/release-integrity.mjs';

const root = path.resolve('public/knowledge/pbl/tutor');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'pbl_tutor_manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, '1.0.0');
assert.ok(manifest.shards?.length, 'Tutor shards missing');
const refs = new Set();
const parts = new Set();
const files = new Set();
for (const descriptor of manifest.shards) {
  assert.ok(!parts.has(descriptor.part) && !files.has(descriptor.file), 'Duplicate tutor shard');
  parts.add(descriptor.part);
  files.add(descriptor.file);
  const records = JSON.parse(verifyArtifact(root, descriptor).toString('utf8'));
  const keys = Object.keys(records);
  assert.equal(keys.length, descriptor.recordCount, descriptor.file);
  assert.equal(keys[0], descriptor.firstQuestionRef, descriptor.file);
  assert.equal(keys.at(-1), descriptor.lastQuestionRef, descriptor.file);
  for (const ref of keys) {
    assert.ok(!refs.has(ref), `Duplicate tutor context: ${ref}`);
    assert.equal(records[ref].questionRef, ref, `Tutor context ID mismatch: ${ref}`);
    refs.add(ref);
  }
}
assert.equal(refs.size, manifest.totalQuestions, 'Tutor total mismatch');
console.log(JSON.stringify({ status: 'ok', shards: parts.size, contexts: refs.size }));
