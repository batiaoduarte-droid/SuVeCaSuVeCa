import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PBL_DIR = path.join(ROOT, 'public', 'knowledge', 'pbl');

const requiredFiles = [
  'pbl_manifest.json',
  'pbl_competency_map.json',
  'pbl_cases.json',
  'pbl_transfer_sets.json',
  'pbl_diagnostic_paths.json',
  'pbl_cumulative_review_sessions.json',
  'question_competency_links.json',
  'question_pedagogy_index.json'
];

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

for (const file of requiredFiles) {
  const fullPath = path.join(PBL_DIR, file);
  check(fs.existsSync(fullPath), `PBL runtime file missing: ${file}`);
}

if (!errors.length) {
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(PBL_DIR, name), 'utf8'));

  const manifest = readJson('pbl_manifest.json');
  const comps = readJson('pbl_competency_map.json');
  const cases = readJson('pbl_cases.json');
  const xfers = readJson('pbl_transfer_sets.json');
  const diags = readJson('pbl_diagnostic_paths.json');
  const sessions = readJson('pbl_cumulative_review_sessions.json');
  const qcl = readJson('question_competency_links.json');
  const qp = readJson('question_pedagogy_index.json');

  check(manifest.schemaVersion === '1.0.0', `Manifest schema version mismatch: ${manifest.schemaVersion}`);
  check(manifest.manifestId === 'PBL-MANIFEST-PORTUGUES-V3', `Manifest ID mismatch: ${manifest.manifestId}`);
  check(comps.length === 190, `Competencies count expected 190, found ${comps.length}`);
  check(cases.length === 190, `Cases count expected 190, found ${cases.length}`);
  check(xfers.length === 190, `Transfer sets count expected 190, found ${xfers.length}`);
  check(diags.length === 190, `Diagnostic paths count expected 190, found ${diags.length}`);
  check(sessions.length === 13, `Cumulative review sessions count expected 13, found ${sessions.length}`);
  check(Object.keys(qcl).length === 2588, `Question competency links count expected 2588, found ${Object.keys(qcl).length}`);
  check(Object.keys(qp).length === 2588, `Question pedagogy index count expected 2588, found ${Object.keys(qp).length}`);

  const compIds = new Set(comps.map((c) => c.competencyId));
  check(cases.every((c) => compIds.has(c.competencyRef)), 'Case references non-existent competency');
  check(xfers.every((x) => compIds.has(x.competencyRef)), 'Transfer set references non-existent competency');
  check(diags.every((d) => compIds.has(d.competencyRef)), 'Diagnostic path references non-existent competency');
  check(Object.values(qcl).every((link) => compIds.has(link.competencyId)), 'Question link references non-existent competency');
}

if (errors.length > 0) {
  console.error(JSON.stringify({ status: 'error', errors }, null, 2));
  process.exit(1);
} else {
  console.log(JSON.stringify({
    status: 'ok',
    manifestId: 'PBL-MANIFEST-PORTUGUES-V3',
    competencies: 190,
    cases: 190,
    transferSets: 190,
    diagnosticPaths: 190,
    cumulativeSessions: 13,
    questionLinks: 2588,
    questionPedagogy: 2588,
    referentialIntegrity: '100% PERFECT'
  }, null, 2));
}
