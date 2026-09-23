import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

const root = fileURLToPath(new URL('..', import.meta.url));
process.chdir(root);
const release = process.argv.includes('--release');
const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' });
console.log(JSON.stringify({ node: process.version, directory: root, mode: release ? 'release' : 'product', gitMetadata: git.status === 0 ? 'available' : 'unavailable (source archive supported)' }));
for (const file of ['package.json', 'package-lock.json', 'server.ts', 'vite.config.ts', 'tsconfig.json', 'src/test/setup.ts', 'product-artifacts.manifest.json', 'schemas/pbl-published-package.schema.json', 'functions/package.json', 'functions/package-lock.json']) {
  if (!fs.existsSync(path.join(root, file))) {
    console.error(`IMPORT_INCOMPLETE: missing ${file}. Restore the matching release; do not regenerate content.`);
    process.exit(1);
  }
}
{
  // Early truncation triage: compare the self-describing inventory totals with the
  // imported tree before running the full byte audit, so a truncated import fails
  // with an actionable cause instead of a wall of hash mismatches.
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'product-artifacts.manifest.json'), 'utf8'));
  const missing = [];
  let presentBytes = 0;
  for (const descriptor of manifest.artifacts) {
    const file = path.join(root, descriptor.file);
    if (!fs.existsSync(file)) { missing.push(descriptor.file); continue; }
    presentBytes += fs.statSync(file).size;
  }
  if (missing.length || (Number.isSafeInteger(manifest.totalBytes) && presentBytes !== manifest.totalBytes)) {
    console.error(JSON.stringify({
      status: 'IMPORT_TRUNCATION_SUSPECTED',
      remediation: 'This is an importer failure, not obsolete or broken content. Restore the missing/truncated files from the same Git revision (git checkout <rev> -- <paths> or download blobs). Do NOT delete tests/validators, do NOT regenerate content, do NOT recompute hashes.',
      expected: { artifacts: manifest.artifacts.length, totalBytes: manifest.totalBytes, largestArtifact: manifest.largestArtifact },
      imported: { presentBytes, missingCount: missing.length, missingFiles: missing.slice(0, 12) },
    }, null, 2));
    process.exit(3);
  }
}
const tool = (file) => path.join(root, 'node_modules', file);
const steps = [
  ['Published artifact bytes', ['scripts/audit-product-artifacts.mjs']],
  ['Product types', [tool('typescript/bin/tsc'), '--noEmit']],
  ['Product tests', [tool('vitest/vitest.mjs'), 'run', '--maxWorkers=2']],
  ...['pedagogical-curriculum', 'deployment-shards', 'question-presentations', 'pedagogical-views', 'pedagogical-view-index', 'pedagogical-macros', 'pbl-runtime', 'pbl-tutor', 'pbl-packages'].map((audit) => [audit, [`scripts/audit-${audit}.mjs`]]),
  ['Browser prerequisites', ['--input-type=module', '-e', "import fs from 'node:fs'; import { chromium } from '@playwright/test'; if (!fs.existsSync(chromium.executablePath())) { console.error('ENVIRONMENT_DEPENDENCY_MISSING: Chromium. Install the browser for the locked Playwright version.'); process.exit(2); }"]],
  ['Browser regressions and accessibility', [tool('@playwright/test/cli.js'), 'test', 'tests/e2e/pbl-flow-accessibility.spec.ts', 'tests/e2e/semantic-views-v42.spec.ts', 'tests/e2e/selective-delivery.spec.ts', 'tests/e2e/flashcard-practice.spec.ts', '--workers=1']],
  ['Client production build', [tool('vite/bin/vite.js'), 'build']],
  ['Server production build', ['scripts/build-server.mjs']],
  ['Compiled server smoke', ['scripts/smoke-production.mjs']],
  ...(release ? [
    ['Functions dependencies', ['-e', "for (const name of ['firebase-functions', 'firebase-admin']) require.resolve(name, {paths:['./functions']});"]],
    ['Functions types', [tool('typescript/bin/tsc'), '--project', 'functions/tsconfig.json', '--noEmit']],
  ] : []),
  ['Published artifacts unchanged', ['scripts/audit-product-artifacts.mjs']],
];
const results = [];
for (const [name, args] of steps) {
  console.log(`\nRunning: ${name}`);
  const start = performance.now();
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', env: { ...process.env, CI: 'true' } });
  const passed = !result.error && result.status === 0;
  results.push({ name, status: passed ? 'PASS' : 'FAIL', seconds: +((performance.now() - start) / 1000).toFixed(2) });
  if (!passed) {
    console.error(JSON.stringify({ status: 'VALIDATION_INCOMPLETE', failed: name, exitCode: result.status, error: result.error?.message, results }, null, 2));
    process.exit(result.status || 1);
  }
}
console.log(JSON.stringify({ status: release ? 'RELEASE_CHECKS_PASSED' : 'PRODUCT_CHECKS_PASSED', results, scope: 'Published inputs, product tests, browser regressions and client build. External synchronization, authenticated cloud services and deployment are not certified.' }, null, 2));
