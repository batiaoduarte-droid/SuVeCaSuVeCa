import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PBL_DIR = path.join(ROOT, 'public', 'knowledge', 'pbl');
const KNOWLEDGE_DIR = path.join(ROOT, 'public', 'knowledge');

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
  const expectedQuestionLinks = manifest.totalOfficialQuestionsCovered;
  const expectedQuestionPedagogy = manifest.totalQuestionPedagogy;
  check(
    Object.keys(qcl).length === expectedQuestionLinks,
    `Question competency links count expected ${expectedQuestionLinks}, found ${Object.keys(qcl).length}`,
  );
  check(
    Object.keys(qp).length === expectedQuestionPedagogy,
    `Question pedagogy index count expected ${expectedQuestionPedagogy}, found ${Object.keys(qp).length}`,
  );

  const compIds = new Set(comps.map((c) => c.competencyId));
  check(cases.every((c) => compIds.has(c.competencyRef)), 'Case references non-existent competency');
  check(xfers.every((x) => compIds.has(x.competencyRef)), 'Transfer set references non-existent competency');
  check(diags.every((d) => compIds.has(d.competencyRef)), 'Diagnostic path references non-existent competency');
  check(Object.values(qcl).every((link) => compIds.has(link.competencyId)), 'Question link references non-existent competency');

  const cleanAnswer = (answer) => String(answer || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(OPTION|LETTER|ALTERNATIVA|OPCAO)[_\s-]*/, '');
  const normalizeAnswer = (answer, multipleChoice) => {
    const cleaned = cleanAnswer(answer);
    if (multipleChoice) return cleaned.replace(/[^A-Z0-9]/g, '');
    if (['C', 'CERTO', 'CORRETO', 'CORRECT', 'TRUE'].includes(cleaned)) return 'C';
    if (['E', 'ERRADO', 'INCORRETO', 'INCORRECT', 'FALSE'].includes(cleaned)) return 'E';
    return cleaned.replace(/[^A-Z0-9]/g, '');
  };
  const gradedCases = cases.filter((pblCase) => typeof pblCase.officialAnswer === 'string' && pblCase.officialAnswer.trim());
  const ungradedCases = cases.filter((pblCase) => !gradedCases.includes(pblCase));
  check(ungradedCases.length === 1, `Expected one protected source without official answer, found ${ungradedCases.length}`);
  for (const pblCase of gradedCases) {
    const multipleChoice = Boolean(pblCase.options?.length);
    const normalizedCorrect = normalizeAnswer(pblCase.officialAnswer, multipleChoice);
    if (multipleChoice) {
      const availableLabels = (pblCase.options || []).map((option) => normalizeAnswer(option.label, true));
      check(availableLabels.includes(normalizedCorrect), `Anchor answer is not renderable: ${pblCase.caseId}`);
    } else {
      check(['C', 'E'].includes(normalizedCorrect), `True/false anchor has unsupported answer: ${pblCase.caseId}`);
    }
  }

  const publishedQuestionRefs = new Set();
  const officialIndex = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, 'official-question-index.json'), 'utf8'));
  officialIndex.items.forEach((item) => publishedQuestionRefs.add(`OQ-${item.questionId.replace(':', '-')}`));
  const viewsDir = path.join(KNOWLEDGE_DIR, 'pedagogical', 'views');
  for (const file of fs.readdirSync(viewsDir).filter((name) => name.endsWith('.json') && name !== 'manifest.json')) {
    const view = JSON.parse(fs.readFileSync(path.join(viewsDir, file), 'utf8'));
    for (const question of view.officialQuestions || []) {
      const questionRef = question.officialQuestionId || question.questionId;
      const answer = question.answerPayload?.answer || question.officialAnswer;
      const prompt = question.questionPayload?.prompt || question.prompt;
      if (questionRef && answer && prompt) publishedQuestionRefs.add(questionRef);
    }
  }
  const transferSetsWithPresentation = xfers.filter((set) =>
    set.items.some((item) => publishedQuestionRefs.has(item.officialQuestionRef))
  );
  check(
    transferSetsWithPresentation.length === xfers.length,
    `Transfer sets without a published question presentation: ${xfers.length - transferSetsWithPresentation.length}`
  );

  const runtimePoolFields = {
    anchor: 'anchorCandidateRefs',
    diagnostic: 'diagnosticCandidateRefs',
    transfer: 'transferCandidateRefs',
    validation: 'validationCandidateRefs',
  };
  const runtimePools = Object.fromEntries(Object.entries(runtimePoolFields).map(([role, field]) => {
    const refs = comps.flatMap((competency) => competency[field] || [])
      .filter((questionRef) => questionRef.includes('-estrategia.'));
    const uniqueRefs = new Set(refs);
    const competenciesWithCandidates = comps.filter((competency) =>
      (competency[field] || []).some((questionRef) => questionRef.includes('-estrategia.'))
    ).length;
    const publishedCandidates = [...uniqueRefs].filter((questionRef) => publishedQuestionRefs.has(questionRef));
    check(
      publishedCandidates.length === uniqueRefs.size,
      `Online ${role} pool has unpublished questions: ${uniqueRefs.size - publishedCandidates.length}`
    );
    check(
      [...uniqueRefs].every((questionRef) => qcl[questionRef] && qp[questionRef]),
      `Online ${role} pool has questions without link or pedagogy`
    );
    return [role, {
      questions: uniqueRefs.size,
      competencies: competenciesWithCandidates,
      published: publishedCandidates.length,
    }];
  }));
  check(runtimePools.anchor.questions > 0, 'Online anchor runtime pool is empty');
  check(runtimePools.diagnostic.questions > 0, 'Online diagnostic runtime pool is empty');
  check(runtimePools.transfer.questions > 0, 'Online transfer runtime pool is empty');
  check(runtimePools.validation.questions > 0, 'Online validation runtime pool is empty');

  globalThis.pblAuditMetrics = {
    gradedCases: gradedCases.length,
    blockedUngradedCases: ungradedCases.length,
    transferSetsWithPresentation: transferSetsWithPresentation.length,
    questionLinks: Object.keys(qcl).length,
    questionPedagogy: Object.keys(qp).length,
    runtimePools,
  };
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
    questionLinks: globalThis.pblAuditMetrics.questionLinks,
    questionPedagogy: globalThis.pblAuditMetrics.questionPedagogy,
    referentialIntegrity: '100% PERFECT',
    answerContract: globalThis.pblAuditMetrics,
  }, null, 2));
}
