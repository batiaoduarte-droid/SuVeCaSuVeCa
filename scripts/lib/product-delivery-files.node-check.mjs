import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listProductDeliveryFiles } from './product-delivery-files.mjs';

const productRoot = fileURLToPath(new URL('../..', import.meta.url));
const documentation = [
  'docs/README.md', 'docs/architecture.md', 'docs/audits/evidence.json',
  'docs/audits/screenshot.png', 'AGENTS.md', 'functions/README.md',
  'AI_STUDIO_SYSTEM_INSTRUCTIONS_2026-09-12.txt',
];
const delivery = ['README.md', 'src/main.ts', 'public/knowledge/view.json', 'server-data/tutor.json'];
const generated = ['node_modules/module.js', 'dist/index.html', 'server-dist/server.cjs', 'release/manifest.json', '.tmp-check/trace.json', 'output.log'];

function fixture(t) {
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const root = fs.mkdtempSync(path.join(temporaryRoot, 'suveca-delivery-'));
  t.after(() => {
    // Cleanup is confined to the newly allocated fixture directory.
    assert.equal(path.dirname(fs.realpathSync(root)), temporaryRoot);
    fs.rmSync(root, { recursive: true, force: true });
  });
  return root;
}

function write(root, file, content = '{}\n') {
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  fs.writeFileSync(path.join(root, file), content);
}

test('Git and source archives exclude local docs but retain the README and runtime artifacts', t => {
  const root = fixture(t);
  const gitRoot = path.join(root, 'checkout');
  const archiveRoot = path.join(root, 'export');
  const ignore = '/docs/\n*.md\n!/README.md\n/AI_STUDIO_SYSTEM_INSTRUCTIONS_2026-09-12.txt\nnode_modules/\ndist/\nserver-dist/\nrelease/\n.tmp-*/\n*.log\n';
  for (const directory of [gitRoot, archiveRoot]) {
    for (const file of [...documentation, ...delivery, ...generated]) write(directory, file);
    write(directory, '.gitignore', ignore);
  }
  const git = args => execFileSync('git', args, { cwd: gitRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git(['init', '--quiet']);
  // Even an index that predates the new local-doc policy cannot consume slots
  // for those docs. Other tracked or untracked product files still count.
  git(['add', '--force', 'docs', 'AGENTS.md', 'README.md', 'src/main.ts']);
  write(gitRoot, 'removed.json');
  git(['add', 'removed.json']);
  fs.unlinkSync(path.join(gitRoot, 'removed.json'));

  const checkout = listProductDeliveryFiles(gitRoot);
  const archive = listProductDeliveryFiles(archiveRoot);
  const expected = [...delivery, '.gitignore'].sort();
  assert.equal(checkout.mode, 'git-candidates');
  assert.equal(archive.mode, 'source-archive');
  assert.deepEqual(checkout.files.sort(), expected);
  assert.deepEqual(archive.files.sort(), expected);
  for (const directory of [gitRoot, archiveRoot]) {
    for (const file of documentation) assert.equal(fs.readFileSync(path.join(directory, file), 'utf8'), '{}\n');
  }
});

test('the artifact auditor retains the 999/1000 boundary and verifies hashes independently of docs', t => {
  const root = fixture(t);
  for (const file of [
    'scripts/audit-product-artifacts.mjs', 'scripts/lib/product-delivery-files.mjs', 'scripts/lib/release-integrity.mjs',
  ]) write(root, file, fs.readFileSync(path.join(productRoot, file)));
  write(root, 'README.md', '# SuVeCa\n');
  const content = Buffer.from('{"version":1}\n');
  const artifact = 'public/knowledge/view.json';
  write(root, artifact, content);
  // A manifest entry is verified even if it is under a documentation path;
  // exclusion from the file budget never skips the integrity contract.
  const evidence = 'docs/evidence.json';
  write(root, evidence, content);
  const artifacts = [artifact, evidence].map(file => ({
    file, bytes: content.length, sha256: createHash('sha256').update(content).digest('hex'),
  }));
  write(root, 'product-artifacts.manifest.json', JSON.stringify({ schemaVersion: 1, totalBytes: content.length * 2, artifacts }));
  for (let index = 0; index < 1001; index++) write(root, `docs/local-${index}.md`);
  const initial = listProductDeliveryFiles(root).files.length;
  for (let index = initial; index < 999; index++) write(root, `fixtures/file-${index}.json`);
  const run = () => spawnSync(process.execPath, ['scripts/audit-product-artifacts.mjs'], { cwd: root, encoding: 'utf8' });
  const passed = run();
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(JSON.parse(passed.stdout).repositoryFiles, 999);

  write(root, 'fixtures/one-more.json');
  const overBudget = run();
  assert.equal(overBudget.status, 1);
  assert.ok(JSON.parse(overBudget.stderr).failures.some(failure => failure.cause === 'file-budget'));
  fs.unlinkSync(path.join(root, 'fixtures/one-more.json'));

  write(root, evidence, '{"version":2}\n');
  const corrupted = run();
  assert.equal(corrupted.status, 1);
  assert.ok(JSON.parse(corrupted.stderr).failures.some(failure => failure.cause === 'sha256-mismatch' && failure.file === evidence));
  write(root, evidence, content);
  write(root, artifact, content.subarray(0, 5));
  const truncated = run();
  assert.equal(truncated.status, 1);
  assert.ok(JSON.parse(truncated.stderr).failures.some(failure => failure.cause === 'size-mismatch' && failure.file === artifact));
});
