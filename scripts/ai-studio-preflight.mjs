import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

console.log('================================================================================');
console.log('                  SUVECA AI STUDIO PREFLIGHT GATEWAY');
console.log('================================================================================\n');

const steps = [
  { name: 'TypeScript Type Check', cmd: 'tsc --noEmit' },
  { name: 'Vitest Unit & Integration Suites', cmd: 'vitest run' },
  { name: 'Pedagogical Curriculum Integrity Audit', cmd: 'node scripts/audit-pedagogical-curriculum.mjs' },
  { name: 'Deployment Shards Integrity Audit', cmd: 'node scripts/audit-deployment-shards.mjs' },
  { name: 'Pedagogical Views Integrity Audit', cmd: 'node scripts/audit-pedagogical-views.mjs' },
  { name: 'PBL Runtime Integrity Audit', cmd: 'node scripts/audit-pbl-runtime.mjs' },
  { name: 'Playwright E2E & Accessibility Suite', cmd: 'npx playwright test tests/e2e/pbl-flow-accessibility.spec.ts' },
  { name: 'Vite Production Build', cmd: 'vite build' }
];

const t0 = performance.now();
let passed = 0;

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  process.stdout.write(`[${i + 1}/${steps.length}] Running: ${step.name}... `);
  const stepStart = performance.now();
  try {
    execSync(step.cmd, { stdio: 'pipe', encoding: 'utf8' });
    const stepDuration = ((performance.now() - stepStart) / 1000).toFixed(2);
    console.log(`[PASS] (${stepDuration}s)`);
    passed++;
  } catch (error) {
    console.log(`[FAIL]`);
    console.error(`\nError in step: ${step.name}`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

const totalDuration = ((performance.now() - t0) / 1000).toFixed(2);

console.log('\n================================================================================');
console.log(`PREFLIGHT SUMMARY: All ${passed}/${steps.length} gates PASSED in ${totalDuration}s`);
console.log('VEREDICT: AI_STUDIO_IMPORT_READY');
console.log('================================================================================');
