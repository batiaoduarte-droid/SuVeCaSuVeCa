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
  'question_pedagogy_index.json',
  'pbl_authored_questions.json',
  'pbl_semantic_coverage_report.json',
  'pbl_content_gap_report.json'
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
  const authoredQuestions = readJson('pbl_authored_questions.json');
  const semanticCoverage = readJson('pbl_semantic_coverage_report.json');
  const contentGaps = readJson('pbl_content_gap_report.json');

  check(manifest.schemaVersion === '1.0.0', `Manifest schema version mismatch: ${manifest.schemaVersion}`);
  check(manifest.manifestId === 'PBL-MANIFEST-PORTUGUES-V3', `Manifest ID mismatch: ${manifest.manifestId}`);
  check(comps.length === 190, `Competencies count expected 190, found ${comps.length}`);
  check(cases.length === 190, `Cases count expected 190, found ${cases.length}`);
  check(xfers.length === 190, `Transfer sets count expected 190, found ${xfers.length}`);
  check(diags.length === 190, `Diagnostic paths count expected 190, found ${diags.length}`);
  check(sessions.length === 13, `Cumulative review sessions count expected 13, found ${sessions.length}`);
  const expectedQuestionLinks = manifest.totalQuestionLinks
    || manifest.totalOfficialQuestionsCovered + (manifest.totalAuthoredQuestions || 0);
  const expectedQuestionPedagogy = manifest.totalQuestionPedagogy;
  check(
    Object.keys(qcl).length === expectedQuestionLinks,
    `Question competency links count expected ${expectedQuestionLinks}, found ${Object.keys(qcl).length}`,
  );
  check(
    Object.keys(qp).length === expectedQuestionPedagogy,
    `Question pedagogy index count expected ${expectedQuestionPedagogy}, found ${Object.keys(qp).length}`,
  );
  check(Object.keys(authoredQuestions).length === 81, `Authored PBL questions expected 81, found ${Object.keys(authoredQuestions).length}`);
  check(manifest.totalAuthoredQuestions === 81, `Manifest authored-question count expected 81, found ${manifest.totalAuthoredQuestions}`);

  const compIds = new Set(comps.map((c) => c.competencyId));
  check(cases.every((c) => compIds.has(c.competencyRef)), 'Case references non-existent competency');
  check(xfers.every((x) => compIds.has(x.competencyRef)), 'Transfer set references non-existent competency');
  check(diags.every((d) => compIds.has(d.competencyRef)), 'Diagnostic path references non-existent competency');
  check(Object.values(qcl).every((link) => compIds.has(link.competencyId)), 'Question link references non-existent competency');
  check(
    Object.values(qcl).every((link) => Array.isArray(link.competencyAssignments) && link.competencyAssignments.length > 0),
    'Question links without atomic competency assignments'
  );
  check(
    Object.values(qcl).flatMap((link) => link.competencyAssignments || [])
      .every((assignment) => compIds.has(assignment.competencyId)),
    'Atomic assignment references non-existent competency'
  );
  check(semanticCoverage.competencies?.length === comps.length, 'Semantic coverage report is incomplete');
  check(semanticCoverage.schemaVersion === '2.0.0', `Semantic coverage schema expected 2.0.0, found ${semanticCoverage.schemaVersion}`);
  check(contentGaps.sourceHash === semanticCoverage.sourceHash, 'Content-gap and semantic-coverage reports have different source hashes');
  const remediatedCompetencies = [
    'COMP-A04-G03-01',
    'COMP-A04-G03-02',
    'COMP-A04-G03-03',
    'COMP-A04-G08-01',
    'COMP-A04-G08-02',
    'COMP-A04-G08-03',
  ];
  const actualLimitedCompetencies = comps
    .filter((competency) => competency.practiceCoverage?.status === 'limited')
    .map((competency) => competency.competencyId)
    .sort();
  check(
    actualLimitedCompetencies.length === 0,
    `Competencies remained limited after authored remediation: ${actualLimitedCompetencies.join(', ')}`
  );
  check(contentGaps.summary?.hardGapFamilies === 0, 'Hard-gap families remained after authored remediation');
  check(contentGaps.summary?.hardGapCompetencies === 0, 'Hard-gap competencies remained after authored remediation');
  check(contentGaps.summary?.minimumQuestionsForAllSessions === 0, 'A session still requires new questions after remediation');
  check(contentGaps.summary?.remediatedFamilies === 2, 'Expected two remediated semantic families');
  check(contentGaps.summary?.authoredQuestionsGenerated === 81, 'Expected 81 generated authored questions');
  check(
    comps.every((competency) => competency.practiceCoverage?.auditedAt === semanticCoverage.auditedAt),
    'Competency semantic coverage metadata is missing or stale'
  );
  check(semanticCoverage.summary?.ready === 190, `Expected 190 ready competencies, found ${semanticCoverage.summary?.ready}`);
  check(semanticCoverage.summary?.limited === 0, `Expected 0 limited competencies, found ${semanticCoverage.summary?.limited}`);
  check(semanticCoverage.summary?.blocked === 0, 'Semantic coverage still reports blocked competencies');

  const semanticRuntimeEligibility = (competency, questionRef) => {
    const link = qcl[questionRef];
    return Boolean(
      link
      && link.competencyAssignments?.some((assignment) =>
        assignment.competencyId === competency.competencyId
        && assignment.lessonId === competency.lessonId
        && assignment.unitId === competency.unitId
        && assignment.semanticStatus === 'approved'
      )
    );
  };
  const semanticRuntimePools = Object.fromEntries([
    ['anchor', 'anchorCandidateRefs'],
    ['diagnostic', 'diagnosticCandidateRefs'],
    ['transfer', 'transferCandidateRefs'],
    ['validation', 'validationCandidateRefs'],
  ].map(([role, field]) => [role, comps.reduce((total, competency) =>
    total + new Set((competency[field] || []).filter((ref) => semanticRuntimeEligibility(competency, ref))).size,
  0)]));
  for (const competency of comps) {
    const coverage = competency.practiceCoverage;
    if (coverage?.status !== 'ready') continue;
    check(coverage.anchorCandidates >= 1, `Ready competency without semantic anchor: ${competency.competencyId}`);
    check(coverage.transferCandidates >= 2, `Ready competency without two semantic transfers: ${competency.competencyId}`);
  }

  const phonetics = comps.find((item) => item.competencyId === 'COMP-A00-G01-01');
  const phoneticsTransfer = xfers.find((item) => item.competencyRef === 'COMP-A00-G01-01');
  const expectedPhoneticsTransfers = [
    'OQ-A00-aula00.q0001',
    'OQ-A00-aula00.q0002',
    'OQ-A00-aula00.q0065',
    'OQ-A00-aula00.q0066',
    'OQ-A00-aula00.q0067',
  ];
  check(
    JSON.stringify(phonetics?.transferCandidateRefs) === JSON.stringify(expectedPhoneticsTransfers),
    'Fonética e Fonologia transfer candidates regressed'
  );
  check(
    JSON.stringify(phoneticsTransfer?.items.map((item) => item.officialQuestionRef)) === JSON.stringify(expectedPhoneticsTransfers),
    'Fonética e Fonologia transfer set regressed'
  );
  check(qcl['OQ-A00-aula00.q0020']?.unitId === 'IP-A00-G04', 'q0020 was not removed from the phonetics unit');
  check(qcl['OQ-A00-aula00.q0020']?.semanticReview?.status === 'blocked', 'q0020 must remain blocked from single-competency PBL');
  check(
    qcl['OQ-A00-aula00.q0020']?.competencyAssignments?.some((assignment) =>
      assignment.competencyId === 'COMP-A00-G01-01'
      && assignment.semanticStatus === 'blocked'
    ),
    'q0020 rejection for Fonética e Fonologia was not preserved atomically'
  );

  const expectedA04G08Refs = [
    'OQ-A04-estrategia.4000777216',
    'OQ-A04-aula04.q0101',
  ];
  for (const competencyId of remediatedCompetencies.filter((id) => id.includes('-G08-'))) {
    const competency = comps.find((item) => item.competencyId === competencyId);
    const authoredRefs = (competency?.eligibleQuestionRefs || []).filter((ref) => ref.startsWith('PBLQ-A04-G08-'));
    check(expectedA04G08Refs.every((ref) => competency?.eligibleQuestionRefs.includes(ref)), `${competencyId} lost an approved official A04-G08 question`);
    check(authoredRefs.length === 41, `${competencyId} expected 41 authored A04-G08 questions, found ${authoredRefs.length}`);
    check(competency?.practiceCoverage?.distinctQuestions === 43, `${competencyId} did not reach 43 distinct questions`);
  }
  const expectedA04G03Refs = [
    'OQ-A04-aula04.q0001',
    'OQ-A04-aula04.q0086',
    'OQ-A04-aula04.q0104',
  ];
  for (const competencyId of remediatedCompetencies.filter((id) => id.includes('-G03-'))) {
    const competency = comps.find((item) => item.competencyId === competencyId);
    const authoredRefs = (competency?.eligibleQuestionRefs || []).filter((ref) => ref.startsWith('PBLQ-A04-G03-'));
    check(expectedA04G03Refs.every((ref) => competency?.eligibleQuestionRefs.includes(ref)), `${competencyId} lost a supporting A04-G03 question`);
    check(authoredRefs.length === 40, `${competencyId} expected 40 authored A04-G03 questions, found ${authoredRefs.length}`);
    check(competency?.practiceCoverage?.distinctQuestions === 43, `${competencyId} did not reach 43 distinct questions`);
    check(competency?.practiceCoverage?.directQuestions === 40, `${competencyId} expected 40 direct authored questions`);
  }
  check(
    semanticCoverage.summary?.finalAverageDistinctQuestions <= 43,
    `Remediated competencies did not reach the final average ${semanticCoverage.summary?.finalAverageDistinctQuestions}`
  );
  const blockedFalseMatches = [
    ['OQ-A05-aula05.q0004', 'COMP-A05-G12-01'],
    ['OQ-A05-aula05.q0023', 'COMP-A05-G10-01'],
    ['OQ-A05-aula05.q0026', 'COMP-A05-G10-01'],
    ['OQ-A05-aula05.q0036', 'COMP-A05-G03-01'],
    ['OQ-A05-aula05.q0041', 'COMP-A05-G03-01'],
  ];
  for (const [questionRef, competencyId] of blockedFalseMatches) {
    check(
      qcl[questionRef]?.competencyAssignments?.some((assignment) =>
        assignment.competencyId === competencyId
        && assignment.semanticStatus === 'blocked'
      ),
      `Known false semantic match was reintroduced: ${questionRef} -> ${competencyId}`
    );
  }

  for (const [questionRef, presentation] of Object.entries(authoredQuestions)) {
    check(questionRef.startsWith('PBLQ-'), `Authored question uses an official-looking ID: ${questionRef}`);
    check(presentation.sourceKind === 'authored_pbl', `Authored provenance missing: ${questionRef}`);
    check(presentation.examBoard === 'Questão autoral PBL', `Authored UI label missing: ${questionRef}`);
    check(Boolean(presentation.prompt && presentation.correctAnswer), `Authored presentation incomplete: ${questionRef}`);
    check(presentation.options?.length === 4, `Authored question must have four alternatives: ${questionRef}`);
    check(
      presentation.options?.some((option) => option.label === presentation.correctAnswer),
      `Authored answer is not renderable: ${questionRef}`
    );
    const link = qcl[questionRef];
    check(link?.sourceKind === 'authored_pbl', `Authored link provenance missing: ${questionRef}`);
    check(qp[questionRef]?.provenance?.semanticOrigin === 'authored_pbl_gap_remediation', `Authored pedagogy provenance missing: ${questionRef}`);
    check(
      link?.competencyAssignments?.filter((assignment) => assignment.semanticStatus === 'approved').length === 3,
      `Authored question must be approved for the three competency variants: ${questionRef}`
    );
  }

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
  check(ungradedCases.length === 0, `All dynamic anchors should have an official answer, found ${ungradedCases.length} ungraded cases`);
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
      const prompt = question.questionPayload?.prompt
        || question.questionPayload?.statement
        || question.prompt
        || question.statement;
      if (questionRef && answer && prompt) publishedQuestionRefs.add(questionRef);
    }
  }
  Object.keys(authoredQuestions).forEach((questionRef) => publishedQuestionRefs.add(questionRef));
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
    authoredQuestions: Object.keys(authoredQuestions).length,
    runtimePools,
    semanticCoverage: semanticCoverage.summary,
    contentGaps: contentGaps.summary,
    semanticRuntimePools,
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
    referentialIntegrity: 'structural references valid',
    answerContract: globalThis.pblAuditMetrics,
  }, null, 2));
}
