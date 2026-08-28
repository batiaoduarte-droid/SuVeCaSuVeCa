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
  const expectedQuestionLinks = manifest.totalRuntimeQuestionLinks
    ?? manifest.totalQuestionLinks
    ?? manifest.totalOfficialQuestionsCovered + (manifest.totalAuthoredQuestions || 0);
  const expectedQuestionPedagogy = manifest.totalRuntimeQuestionPedagogy
    ?? manifest.totalQuestionPedagogy;
  const expectedRuntimeAuthoredQuestions = manifest.totalRuntimeAuthoredQuestions
    ?? manifest.totalAuthoredQuestions;
  check(
    Object.keys(qcl).length === expectedQuestionLinks,
    `Question competency links count expected ${expectedQuestionLinks}, found ${Object.keys(qcl).length}`,
  );
  check(
    Object.keys(qp).length === expectedQuestionPedagogy,
    `Question pedagogy index count expected ${expectedQuestionPedagogy}, found ${Object.keys(qp).length}`,
  );
  check(
    Object.keys(authoredQuestions).length === expectedRuntimeAuthoredQuestions,
    `Runtime authored PBL questions expected ${expectedRuntimeAuthoredQuestions}, found ${Object.keys(authoredQuestions).length}`,
  );
  check(manifest.totalAuthoredQuestions === 81, `Manifest authored-question count expected 81, found ${manifest.totalAuthoredQuestions}`);
  if (manifest.totalRuntimeAuthoredQuestions !== undefined) {
    const quarantinedQuestionRef = 'PBLQ-A04-G03-020';
    const quarantinedRefs = manifest.questionBankOverlay?.questionQuarantine?.blockedQuestionRefs || [];
    check(quarantinedRefs.includes(quarantinedQuestionRef), 'Manifest lost the authored-question quarantine ledger');
    check(manifest.totalRuntimeAuthoredQuestions === 80, `Runtime authored-question count expected 80, found ${manifest.totalRuntimeAuthoredQuestions}`);
    check(!(quarantinedQuestionRef in authoredQuestions), 'Quarantined authored question leaked into presentations');
    check(!(quarantinedQuestionRef in qcl), 'Quarantined authored question leaked into competency links');
    check(!(quarantinedQuestionRef in qp), 'Quarantined authored question leaked into pedagogy index');
    check(
      ![comps, cases, xfers, diags, sessions].some((value) => JSON.stringify(value).includes(quarantinedQuestionRef)),
      'Quarantined authored question leaked into a runtime PBL structure',
    );
  }

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
  const expectedTransferLimitedCompetencies = [
    'COMP-A05-G03-01',
    'COMP-A05-G03-02',
    'COMP-A05-G03-03',
    'COMP-A07-G05-01',
    'COMP-A07-G05-02',
    'COMP-A07-G05-03',
    'COMP-A07-G06-01',
    'COMP-A07-G06-02',
  ];
  check(
    JSON.stringify(actualLimitedCompetencies) === JSON.stringify(expectedTransferLimitedCompetencies),
    `Transfer-limited competencies diverge from item-level audit: ${actualLimitedCompetencies.join(', ')}`
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
  const readyCompetencies = comps.filter((competency) => competency.practiceCoverage?.status === 'ready').length;
  check(
    semanticCoverage.summary?.ready === readyCompetencies,
    `Semantic coverage ready count diverges: ${semanticCoverage.summary?.ready}/${readyCompetencies}`
  );
  check(
    semanticCoverage.summary?.limited === actualLimitedCompetencies.length,
    `Semantic coverage limited count diverges: ${semanticCoverage.summary?.limited}/${actualLimitedCompetencies.length}`
  );
  check(semanticCoverage.summary?.blocked === 0, 'Semantic coverage still reports blocked competencies');

  const semanticRuntimeEligibility = (competency, questionRef, role) => {
    const link = qcl[questionRef];
    return Boolean(
      link
      && link.competencyAssignments?.some((assignment) =>
        assignment.competencyId === competency.competencyId
        && assignment.lessonId === competency.lessonId
        && assignment.unitId === competency.unitId
        && assignment.semanticStatus === 'approved'
        && (!role || assignment.allowedRoles?.includes(role))
      )
    );
  };
  const semanticRuntimePools = Object.fromEntries([
    ['anchor', 'anchorCandidateRefs'],
    ['diagnostic', 'diagnosticCandidateRefs'],
    ['transfer', 'transferCandidateRefs'],
    ['validation', 'validationCandidateRefs'],
  ].map(([role, field]) => [role, comps.reduce((total, competency) =>
    total + new Set((competency[field] || []).filter((ref) => semanticRuntimeEligibility(competency, ref, role))).size,
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
  const adjudicatedA04G03 = authoredQuestions['PBLQ-A04-G03-020'];
  check(
    adjudicatedA04G03?.correctAnswer === 'B',
    'PBLQ-A04-G03-020 must publish the authorially adjudicated answer B'
  );
  check(
    qp['PBLQ-A04-G03-020']?.causalDiagnosticReview?.status === 'not_reviewed'
    && qp['PBLQ-A04-G03-020']?.errorDiagnosticPotential?.diagnosable === false,
    'PBLQ-A04-G03-020 must remain practice-only until a new causal dual pass'
  );
  check(
    comps.every((competency) =>
      !(competency.diagnosticCandidateRefs || []).includes('PBLQ-A04-G03-020')
      && !(competency.transferCandidateRefs || []).includes('PBLQ-A04-G03-020')
      && !(competency.validationCandidateRefs || []).includes('PBLQ-A04-G03-020')
    ),
    'PBLQ-A04-G03-020 re-entered a specialized PBL pool without new review'
  );

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

  // O universo causal é o conjunto realmente autorizado para sondagem, não
  // todo o banco. Uma referência antiga, ainda que válida, não certifica
  // causalidade sem status, mecanismo, confiança e revisão dupla da questão.
  const pedagogyItems = Object.values(qp);
  const distractorEntries = pedagogyItems.flatMap((item) => item.distractorAnalysis || []);
  const diagnosticQuestionRefs = new Set(
    comps.flatMap((competency) => competency.diagnosticCandidateRefs || [])
  );
  const diagnosticPedagogyItems = [...diagnosticQuestionRefs]
    .map((questionRef) => qp[questionRef])
    .filter(Boolean);
  const hasReviewedCausalMapping = (entry) => Boolean(
    entry?.causalStatus === 'causal_candidate'
    && typeof entry?.errorMechanism === 'string'
    && entry.errorMechanism.trim()
    && Number(entry.mappingConfidence) >= 0.60
  );
  const hasLegacySemanticRefs = (entry) => Boolean(
    typeof entry?.likelyMisconceptionRef === 'string' && entry.likelyMisconceptionRef.trim()
    || typeof entry?.triggeredTrapRef === 'string' && entry.triggeredTrapRef.trim()
  );
  const hasOptionFeedback = (entry) => Boolean(
    typeof entry?.analysis === 'string' && entry.analysis.trim()
    || typeof entry?.refutation === 'string' && entry.refutation.trim()
    || typeof entry?.errorPattern === 'string' && entry.errorPattern.trim()
  );
  const questionsWithReviewedCausalMapping = diagnosticPedagogyItems.filter((item) =>
    item.causalDiagnosticReview?.status === 'dual_pass_reviewed'
    && (item.distractorAnalysis || []).some(hasReviewedCausalMapping)
  ).length;
  const questionsWithFeedbackOnly = diagnosticPedagogyItems.filter((item) => {
    const entries = item.distractorAnalysis || [];
    return entries.length > 0
      && !entries.some(hasReviewedCausalMapping)
      && entries.some(hasOptionFeedback);
  }).length;
  const questionsWithoutDistractorEvidence = diagnosticPedagogyItems.filter((item) => {
    const entries = item.distractorAnalysis || [];
    return entries.length === 0 || !entries.some((entry) =>
      hasReviewedCausalMapping(entry) || hasOptionFeedback(entry)
    );
  }).length;
  const diagnosableWithoutAnyCausalMapping = diagnosticPedagogyItems.filter((item) =>
    item.errorDiagnosticPotential?.diagnosable === true
    && !(item.distractorAnalysis || []).some(hasReviewedCausalMapping)
  ).length;
  const mechanismOnlyMappings = diagnosticPedagogyItems.flatMap((item) =>
    item.distractorAnalysis || []
  ).filter((entry) => hasReviewedCausalMapping(entry) && !entry.likelyMisconceptionRef).length;
  const canonicalMisconceptionMappings = diagnosticPedagogyItems.flatMap((item) =>
    item.distractorAnalysis || []
  ).filter((entry) => hasReviewedCausalMapping(entry) && entry.likelyMisconceptionRef).length;
  const legacyUnreviewedMappings = pedagogyItems.flatMap((item) =>
    (item.distractorAnalysis || []).map((entry) => ({ item, entry }))
  ).filter(({ item, entry }) =>
    hasLegacySemanticRefs(entry)
    && (
      item.causalDiagnosticReview?.status !== 'dual_pass_reviewed'
      || !hasReviewedCausalMapping(entry)
    )
  ).length;
  for (const competency of comps) {
    for (const questionRef of competency.diagnosticCandidateRefs || []) {
      const item = qp[questionRef];
      check(Boolean(item), `Diagnostic candidate without pedagogy: ${questionRef}`);
      check(
        item?.causalDiagnosticReview?.status === 'dual_pass_reviewed',
        `Diagnostic candidate without dual-pass causal review: ${questionRef}`
      );
      check(
        item?.causalDiagnosticReview?.unitRefs?.includes(competency.unitId),
        `Causal review does not authorize target unit: ${questionRef} -> ${competency.unitId}`
      );
      check(
        item?.errorDiagnosticPotential?.diagnosable === true
        && (item?.distractorAnalysis || []).some(hasReviewedCausalMapping),
        `Diagnostic candidate without a reviewed causal option: ${questionRef}`
      );
      check(
        semanticRuntimeEligibility(competency, questionRef, 'diagnostic'),
        `Diagnostic candidate lacks atomic role authorization: ${questionRef} -> ${competency.competencyId}`
      );
    }
  }
  const compById = new Map(comps.map((competency) => [competency.competencyId, competency]));
  const diagByComp = new Map(diags.map((path) => [path.competencyRef, path]));
  for (const competency of comps) {
    const path = diagByComp.get(competency.competencyId);
    check(Boolean(path), `Diagnostic path missing: ${competency.competencyId}`);
    for (const node of path?.nodes || []) {
      check(
        !node.onIncorrect?.detectedMisconceptionRef && !node.onIncorrect?.triggeredTrapRef,
        `Diagnostic path hard-codes a cause independently of the selected option: ${path.pathId}:${node.nodeId}`
      );
      if (node.evaluatedPrerequisiteRef) {
        const prerequisite = compById.get(node.evaluatedPrerequisiteRef);
        check(
          competency.prerequisiteCompetencyRefs?.includes(node.evaluatedPrerequisiteRef),
          `Path probes an undeclared prerequisite: ${path.pathId}:${node.nodeId}`
        );
        check(
          node.onIncorrect?.nextAction === 'branch_to_prerequisite',
          `Prerequisite node does not branch to prerequisite: ${path.pathId}:${node.nodeId}`
        );
        check(
          prerequisite && semanticRuntimeEligibility(prerequisite, node.questionRef, 'diagnostic'),
          `Prerequisite node uses a question not authorized for the prerequisite: ${path.pathId}:${node.nodeId}`
        );
      } else {
        check(
          node.onIncorrect?.nextAction !== 'branch_to_prerequisite',
          `Current-competency question falsely branches to prerequisite: ${path.pathId}:${node.nodeId}`
        );
      }
    }
  }
  check(
    distractorEntries.every((entry) =>
      typeof entry?.label === 'string'
      && entry.label.trim()
      && (hasReviewedCausalMapping(entry) || hasOptionFeedback(entry))
    ),
    'Distractor analysis contains entries without a selectable label or usable feedback'
  );
  const diagnosticEvidence = {
    totalQuestions: pedagogyItems.length,
    diagnosticQuestionUniverse: diagnosticQuestionRefs.size,
    questionsWithReviewedCausalMapping,
    questionsWithFeedbackOnly,
    questionsWithoutDistractorEvidence,
    dualPassReviewedQuestions: diagnosticPedagogyItems.filter((item) =>
      item.causalDiagnosticReview?.status === 'dual_pass_reviewed'
    ).length,
    canonicalMisconceptionMappings,
    mechanismOnlyMappings,
    legacyUnreviewedMappings,
    diagnosableWithoutAnyCausalMapping,
    policy: 'single option => causal hypothesis; only recurrence in an independent probe confirms the mechanism',
  };
  const reviewedCausalPedagogy = pedagogyItems.filter((item) =>
    item.causalDiagnosticReview?.status === 'dual_pass_reviewed'
  );
  const reviewedCausalOptionMappings = reviewedCausalPedagogy.flatMap((item) =>
    (item.distractorAnalysis || []).filter((entry) =>
      entry.causalStatus === 'causal_candidate' || entry.causalStatus === 'feedback_only'
    )
  ).length;
  const feedbackOnlyReviewedQuestions = reviewedCausalPedagogy.filter((item) =>
    !(item.distractorAnalysis || []).some(hasReviewedCausalMapping)
  ).length;
  for (const competency of comps) {
    const coverage = competency.causalDiagnosticCoverage;
    const candidates = competency.diagnosticCandidateRefs || [];
    check(Boolean(coverage), `Competency lacks causal coverage metadata: ${competency.competencyId}`);
    check(
      JSON.stringify(coverage?.reviewedQuestionRefs || []) === JSON.stringify(candidates),
      `Causal coverage diverges from diagnostic candidates: ${competency.competencyId}`
    );
    check(
      coverage?.availability === (candidates.length > 0 ? 'ready' : 'feedback_only'),
      `Causal availability diverges from reviewed candidates: ${competency.competencyId}`
    );
  }
  check(
    semanticCoverage.summary?.causallyReviewedDiagnosticQuestions === reviewedCausalPedagogy.length,
    'Semantic coverage overstates or understates dual-pass causal reviews'
  );
  check(
    semanticCoverage.summary?.causalDiagnosticQuestionsAuthorized === diagnosticQuestionRefs.size,
    'Semantic coverage diverges from the authorized causal diagnostic universe'
  );
  check(
    semanticCoverage.summary?.causalFeedbackOnlyReviewedQuestions === feedbackOnlyReviewedQuestions,
    'Semantic coverage diverges from feedback-only reviewed questions'
  );
  check(
    semanticCoverage.summary?.causalOptionMappings === reviewedCausalOptionMappings,
    'Semantic coverage diverges from reviewed causal option mappings'
  );
  check(
    questionsWithReviewedCausalMapping === diagnosticQuestionRefs.size,
    `Causal coverage incomplete: ${questionsWithReviewedCausalMapping}/${diagnosticQuestionRefs.size}`
  );
  check(diagnosableWithoutAnyCausalMapping === 0, 'Diagnosable questions remain without reviewed causal mapping');

  // `transferType` e `cognitiveDelta` legados são declarações de autoria, não
  // prova de mudança estrutural. Só metadados auditados podem certificar distância.
  const transferItems = xfers.flatMap((set) => set.items || []);
  const auditedTransferItems = transferItems.filter((item) => item.validationStatus === 'audited');
  check(
    auditedTransferItems.every((item) =>
      Array.isArray(item.changedDimensions)
      && item.changedDimensions.length > 0
      && typeof item.anchorQuestionRef === 'string'
      && item.anchorQuestionRef.trim()
      && typeof item.sharedCore === 'string'
      && item.sharedCore.trim().length >= 15
      && typeof item.structuralDifference === 'string'
      && item.structuralDifference.trim().length >= 15
      && typeof item.cognitiveDelta === 'string'
      && item.cognitiveDelta.trim().length >= 15
      && typeof item.expectedObstacle === 'string'
      && item.expectedObstacle.trim().length >= 15
      && Number(item.transferConfidence) >= 0.60
      && item.transferReview?.status === 'dual_pass_reviewed'
    ),
    'An audited transfer item lacks structural comparison or dual-pass provenance'
  );
  const caseById = new Map(cases.map((pblCase) => [pblCase.caseId, pblCase]));
  for (const transferSet of xfers) {
    const anchorRef = caseById.get(transferSet.primaryCaseRef)?.anchorQuestionRef;
    check(Boolean(anchorRef), `Transfer set has no published anchor: ${transferSet.transferSetId}`);
    check(
      transferSet.itemLevelAudit?.auditedItems
        === (transferSet.items || []).filter((item) => item.validationStatus === 'audited').length,
      `Transfer audit summary diverges from items: ${transferSet.transferSetId}`
    );
    check(
      (transferSet.items || []).every((item) =>
        item.officialQuestionRef !== anchorRef
        && item.anchorQuestionRef === anchorRef
      ),
      `Transfer set contains its anchor or compares against another anchor: ${transferSet.transferSetId}`
    );
    const itemOrders = (transferSet.items || []).map((item) => item.itemOrder);
    check(
      new Set(itemOrders).size === itemOrders.length,
      `Transfer set has duplicate item order: ${transferSet.transferSetId}`
    );
  }
  for (const competency of comps.filter((item) => item.practiceCoverage?.status === 'ready')) {
    const transferSet = xfers.find((item) => item.competencyRef === competency.competencyId);
    check(
      (transferSet?.items || []).filter((item) => item.validationStatus === 'audited').length >= 2,
      `Ready competency lacks two audited transfer pairs: ${competency.competencyId}`
    );
  }
  const transferTypeCounts = auditedTransferItems.reduce((counts, item) => ({
    ...counts,
    [item.transferType]: (counts[item.transferType] || 0) + 1,
  }), {});
  const transferStructuralEvidence = {
    totalItems: transferItems.length,
    auditedItems: auditedTransferItems.length,
    inferredItems: transferItems.filter((item) => item.validationStatus === 'inferred').length,
    explicitlyUnverifiedItems: transferItems.filter((item) => item.validationStatus === 'unverified').length,
    sourceDeclaredOnlyItems: transferItems.filter((item) =>
      !item.validationStatus && Boolean(item.transferType || item.cognitiveDelta)
    ).length,
    transferTypeCounts,
    policy: 'only item-level dual-pass comparisons enter transfer progression or mastery evidence',
  };
  check(
    transferStructuralEvidence.inferredItems === 0
    && transferStructuralEvidence.sourceDeclaredOnlyItems === 0,
    'Legacy inferred/source-declared transfer labels remain in the runtime'
  );

  const transferSetById = new Map(xfers.map((set) => [set.transferSetId, set]));
  for (const cumulativeSession of sessions) {
    const coveredLessons = new Set(cumulativeSession.coveredCurricularLessons || []);
    const integratedCompetencies = (cumulativeSession.integratedCompetencyRefs || [])
      .map((competencyId) => comps.find((competency) => competency.competencyId === competencyId))
      .filter(Boolean);
    const integratedLessons = new Set(integratedCompetencies.map((competency) => competency.lessonId));
    check(
      integratedCompetencies.length === (cumulativeSession.integratedCompetencyRefs || []).length,
      `Cumulative session references an unknown competency: ${cumulativeSession.sessionId}`
    );
    check(
      coveredLessons.size === cumulativeSession.spiralProgressionLevel,
      `Cumulative spiral level does not match covered lessons: ${cumulativeSession.sessionId}`
    );
    check(
      [...coveredLessons].every((lessonId) => integratedLessons.has(lessonId)),
      `Cumulative session does not interleave every declared lesson: ${cumulativeSession.sessionId}`
    );
    check(
      Array.isArray(cumulativeSession.activeReviewProtocols)
      && cumulativeSession.activeReviewProtocols.some((protocol) => protocol.trim()),
      `Cumulative session has no active retrieval protocol: ${cumulativeSession.sessionId}`
    );
    check(
      (cumulativeSession.crossLessonTransferSetRefs || []).every((transferSetId) => {
        const transferSet = transferSetById.get(transferSetId);
        return transferSet
          && (cumulativeSession.integratedCompetencyRefs || []).includes(transferSet.competencyRef);
      }),
      `Cumulative session has a cross-lesson transfer outside its competency set: ${cumulativeSession.sessionId}`
    );
  }
  const cumulativeReviewContract = {
    sessions: sessions.length,
    withActiveRetrievalProtocol: sessions.filter((session) =>
      session.activeReviewProtocols?.some((protocol) => protocol.trim())
    ).length,
    withCrossLessonFocus: sessions.filter((session) =>
      (session.crossLessonTransferSetRefs || []).length > 0
    ).length,
    multiLessonSessions: sessions.filter((session) =>
      new Set(session.coveredCurricularLessons || []).size > 1
    ).length,
  };

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
    diagnosticEvidence,
    transferStructuralEvidence,
    cumulativeReviewContract,
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
