import { describe, expect, it } from 'vitest';
import type {
  PBLAttempt,
  PBLCompetency,
  PBLDiagnosticPath,
  PBLQuestionPresentation,
  QuestionCompetencyLink,
  QuestionDistractor,
  QuestionPedagogy,
} from '../../../types/pbl';
import type { IPBLRepository } from '../data/PBLRepository';
import { DiagnosticResolver } from '../engine/DiagnosticResolver';
import {
  findSelectedDistractor,
  normalizeDistractorAnalysis,
} from '../engine/distractorAnalysisAdapter';

const competencyId = 'COMP-TEST-01';
const unitId = 'IP-TEST-01';

const makeCompetency = (overrides: Partial<PBLCompetency> = {}): PBLCompetency => ({
  schemaVersion: '1.0.0',
  competencyId,
  lessonId: 'TEST',
  unitId,
  title: 'Competência de teste',
  description: 'Aplicar um critério de teste.',
  pedagogicalDomain: 'procedural',
  bloomLevel: 'apply',
  learningObjectiveRefs: ['LO-TEST-01'],
  conceptRefs: [],
  ruleRefs: ['RULE-TEST-01'],
  procedureRefs: ['PROC-TEST-01'],
  contrastRefs: ['CONTRAST-TEST-01'],
  examTrapRefs: ['TRAP-GENERIC'],
  misconceptionRefs: ['MISC-GENERIC'],
  prerequisiteCompetencyRefs: [],
  eligibleQuestionRefs: [],
  anchorCandidateRefs: [],
  diagnosticCandidateRefs: [],
  transferCandidateRefs: [],
  validationCandidateRefs: [],
  questionCount: 0,
  ...overrides,
});

const makePedagogy = (
  questionRef: string,
  distractorAnalysis: QuestionDistractor[],
  causalReview = true
): QuestionPedagogy => ({
  officialQuestionRef: questionRef,
  distractorAnalysis,
  decisiveRuleRefs: ['RULE-TEST-01'],
  procedureRefs: ['PROC-TEST-01'],
  contrastRefs: ['CONTRAST-TEST-01'],
  causalDiagnosticReview: causalReview ? {
    status: 'dual_pass_reviewed',
    unitRefs: [unitId],
  } : undefined,
  pblSuitability: {
    anchor: 0.8,
    diagnostic: 0.9,
    transfer: 0.8,
    validation: 0.8,
    primaryRole: 'diagnostic',
  },
} as QuestionPedagogy);

const makeLink = (
  questionRef: string,
  relation: 'primary' | 'secondary' = 'primary',
  targetCompetencyId = competencyId
): QuestionCompetencyLink => ({
  officialQuestionRef: questionRef,
  competencyId: targetCompetencyId,
  unitId,
  lessonId: 'TEST',
  pblSuitabilityScores: {
    anchor: 0.8,
    diagnostic: 0.9,
    transfer: 0.8,
    validation: 0.8,
    primaryRole: 'diagnostic',
  },
  competencyAssignments: [{
    assignmentId: `${questionRef}::${targetCompetencyId}`,
    competencyId: targetCompetencyId,
    unitId,
    lessonId: 'TEST',
    relation,
    semanticStatus: 'approved',
    allowedRoles: ['anchor', 'diagnostic', 'transfer', 'validation'],
    roleScores: { anchor: 0.8, diagnostic: 0.9, transfer: 0.8, validation: 0.8 },
    evidenceRefs: ['TEST'],
    reviewMethod: 'editorial',
    reviewedAt: '2026-08-26T00:00:00.000Z',
    reason: 'Fixture de teste.',
  }],
} as QuestionCompetencyLink);

const makePresentation = (questionRef: string): PBLQuestionPresentation => ({
  questionRef,
  questionType: 'multiple_choice',
  prompt: 'Qual alternativa aplica corretamente o critério?',
  options: [
    { label: 'A', text: 'Alternativa A' },
    { label: 'B', text: 'Alternativa B' },
  ],
  correctAnswer: 'B',
});

const makeAttempt = (overrides: Partial<PBLAttempt> = {}): PBLAttempt => ({
  attemptId: 'ATT-TEST',
  sessionId: 'SESSION-TEST',
  questionRef: 'Q-ANCHOR',
  competencyRef: competencyId,
  stage: 'initial',
  userAnswer: 'A',
  correctAnswer: 'B',
  isCorrect: false,
  confidence: 'low',
  evaluation: 'error',
  responseTimeMs: 1_000,
  detectedTrapRefs: [],
  detectedMisconceptionRefs: [],
  interventionRefs: [],
  createdAt: '2026-08-26T00:00:00.000Z',
  ...overrides,
});

interface RepoFixture {
  competency?: PBLCompetency;
  path?: PBLDiagnosticPath | null;
  pedagogies?: Record<string, QuestionPedagogy>;
  links?: Record<string, QuestionCompetencyLink>;
  presentations?: Record<string, PBLQuestionPresentation>;
}

const makeRepo = (fixture: RepoFixture): IPBLRepository => {
  const competency = fixture.competency || makeCompetency();
  const pedagogies = fixture.pedagogies || {};
  const links = fixture.links || {};
  const presentations = fixture.presentations || {};
  return {
    getQuestionPedagogy: async (questionRef: string) => pedagogies[questionRef] || null,
    getDiagnosticPathForCompetency: async () => fixture.path || null,
    getCompetency: async (id: string) => id === competency.competencyId ? competency : makeCompetency({ competencyId: id }),
    getQuestionCompetencyLink: async (questionRef: string) => links[questionRef] || null,
    getQuestionPresentation: async (questionRef: string) => presentations[questionRef] || null,
  } as unknown as IPBLRepository;
};

describe('distractorAnalysisAdapter', () => {
  it('normalizes the online analysis dialect as feedback, not semantic evidence', () => {
    const [normalized] = normalizeDistractorAnalysis([{
      label: 'A',
      analysis: 'Incorreta. A regra exige outra estrutura.',
    }]);

    expect(normalized).toMatchObject({
      label: 'A',
      errorPattern: 'Incorreta. A regra exige outra estrutura.',
      refutation: 'Incorreta. A regra exige outra estrutura.',
      evidenceSource: 'option_analysis',
      likelyMisconceptionRef: null,
      triggeredTrapRef: null,
    });
  });

  it('does not force a sole Julgamento record onto every true/false error', () => {
    const distractors = normalizeDistractorAnalysis([{
      label: 'Julgamento',
      isCorrect: true,
      likelyMisconceptionRef: 'MISC-SHOULD-NOT-MATCH',
      refutation: 'A assertiva está correta.',
    }]);

    expect(findSelectedDistractor(distractors, 'Errado', false)).toBeUndefined();
  });
});

describe('DiagnosticResolver evidence policy', () => {
  it('never assigns a misconception or trap to a fragile correct answer', async () => {
    const questionRef = 'Q-FRAGILE';
    const resolver = new DiagnosticResolver(makeRepo({
      pedagogies: {
        [questionRef]: makePedagogy(questionRef, [
          {
            label: 'A',
            likelyMisconceptionRef: 'MISC-SHOULD-NOT-TRIGGER',
            triggeredTrapRef: 'TRAP-SHOULD-NOT-TRIGGER',
          },
          {
            label: 'B',
            analysis: 'Alternativa correta.',
          },
        ]),
      },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({
      questionRef,
      userAnswer: 'B',
      isCorrect: true,
      confidence: 'low',
      evaluation: 'fragile_correct',
    }));

    expect(result.diagnosisKind).toBe('unknown');
    expect(result.misconceptionRefs).toEqual([]);
    expect(result.trapRefs).toEqual([]);
    expect(result.needsProbe).toBe(false);
  });

  it('uses an exact native distractor mapping as misconception evidence', async () => {
    const questionRef = 'Q-MAPPED';
    const resolver = new DiagnosticResolver(makeRepo({
      pedagogies: {
        [questionRef]: makePedagogy(questionRef, [{
          label: 'A',
          causalStatus: 'causal_candidate',
          errorMechanism: 'polarity_inversion',
          mappingConfidence: 0.90,
          errorPattern: 'Generalização indevida da regra.',
          likelyMisconceptionRef: 'MISC-A',
          triggeredTrapRef: 'TRAP-A',
          refutation: 'A condição necessária não foi satisfeita.',
        }]),
      },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({ questionRef }));

    expect(result.diagnosisKind).toBe('mapped_error_hypothesis');
    expect(result.diagnosticEvidence?.source).toBe('distractor_mapping');
    expect(result.candidateMisconceptionRefs).toEqual(['MISC-A']);
    expect(result.trapRefs).toEqual(['TRAP-A']);
    expect(result.diagnosticConfidence).toBeGreaterThanOrEqual(0.60);
    expect(result.needsProbe).toBe(false);
  });

  it('keeps online option analysis as a slip and does not invent refs', async () => {
    const questionRef = 'Q-ONLINE';
    const resolver = new DiagnosticResolver(makeRepo({
      pedagogies: {
        [questionRef]: makePedagogy(questionRef, [{
          label: 'A',
          analysis: 'Incorreta. A alternativa desconsidera a condição restritiva.',
        }]),
      },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({
      questionRef,
      confidence: 'high',
      evaluation: 'high_confidence_error',
    }));

    expect(result.diagnosisKind).toBe('slip');
    expect(result.diagnosticEvidence?.source).toBe('option_analysis');
    expect(result.misconceptionRefs).toEqual([]);
    expect(result.trapRefs).toEqual([]);
    expect(result.diagnosticConfidence).toBe(0.55);
    expect(result.needsProbe).toBe(false);
  });

  it('keeps raw options as unreviewed and does not promote them to misconceptions', async () => {
    const questionRef = 'Q-RAW';
    const resolver = new DiagnosticResolver(makeRepo({
      pedagogies: {
        [questionRef]: makePedagogy(questionRef, [{
          label: 'A',
          optionText: 'Alternativa sem justificativa causal homologada.',
        }]),
      },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({ questionRef }));

    expect(result.diagnosisKind).toBe('slip');
    expect(result.diagnosticEvidence?.source).toBe('none');
    expect(result.misconceptionRefs).toEqual([]);
    expect(result.trapRefs).toEqual([]);
    expect(result.diagnosticConfidence).toBe(0.5);
    expect(result.needsProbe).toBe(false);
  });

  it('does not turn high confidence alone into causal confidence', async () => {
    const questionRef = 'Q-UNKNOWN';
    const resolver = new DiagnosticResolver(makeRepo({
      pedagogies: { [questionRef]: makePedagogy(questionRef, []) },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({
      questionRef,
      confidence: 'high',
      evaluation: 'high_confidence_error',
    }));

    expect(result.diagnosisKind).toBe('unknown');
    expect(result.diagnosticConfidence).toBe(0.3);
    expect(result.misconceptionRefs).toEqual([]);
  });

  it('classifies an answered prerequisite branch without also asserting a misconception', async () => {
    const questionRef = 'Q-PREREQ';
    const path: PBLDiagnosticPath = {
      schemaVersion: '1.0.0',
      pathId: 'PATH-TEST',
      competencyRef: competencyId,
      title: 'Sondagem de pré-requisito',
      unitRef: unitId,
      targetConceptRef: 'CONCEPT-TEST',
      entryNodeId: 'NODE-PREREQ',
      nodes: [{
        nodeId: 'NODE-PREREQ',
        questionRef,
        nodeType: 'entry_probe',
        evaluatedPrerequisiteRef: 'COMP-PREREQ-01',
        onCorrect: {
          nextAction: 'graduate_path',
          feedbackMessage: 'Pré-requisito confirmado.',
        },
        onIncorrect: {
          detectedMisconceptionRef: 'MISC-PATH',
          correctiveMicroLesson: 'Retome o pré-requisito.',
          nextAction: 'branch_to_prerequisite',
        },
      }],
      terminalOutcomes: [],
    };
    const resolver = new DiagnosticResolver(makeRepo({
      competency: makeCompetency({ prerequisiteCompetencyRefs: ['COMP-PREREQ-01'] }),
      path,
      pedagogies: { [questionRef]: makePedagogy(questionRef, []) },
      links: { [questionRef]: makeLink(questionRef) },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({ questionRef, stage: 'probe' }));

    expect(result.diagnosisKind).toBe('prerequisite_deficit');
    expect(result.prerequisiteCompetencyRef).toBe('COMP-PREREQ-01');
    expect(result.diagnosticEvidence).toMatchObject({
      source: 'diagnostic_path',
      pathNodeId: 'NODE-PREREQ',
    });
    expect(result.misconceptionRefs).toEqual([]);
    expect(result.needsProbe).toBe(false);
  });

  it('prefers an authored prerequisite probe over a generic online probe', async () => {
    const anchorRef = 'Q-OUTSIDE-PATH';
    const prerequisiteProbeRef = 'Q-PREREQ-PROBE';
    const onlineProbeRef = 'OQ-TEST-estrategia.1';
    const path: PBLDiagnosticPath = {
      schemaVersion: '1.0.0',
      pathId: 'PATH-TEST',
      competencyRef: competencyId,
      title: 'Sondagem de pré-requisito',
      unitRef: unitId,
      targetConceptRef: 'CONCEPT-TEST',
      entryNodeId: 'NODE-PREREQ',
      nodes: [{
        nodeId: 'NODE-PREREQ',
        questionRef: prerequisiteProbeRef,
        nodeType: 'entry_probe',
        evaluatedPrerequisiteRef: 'COMP-PREREQ-01',
        onCorrect: { nextAction: 'graduate_path', feedbackMessage: 'Confirmado.' },
        onIncorrect: {
          correctiveMicroLesson: 'Retome o pré-requisito.',
          nextAction: 'branch_to_prerequisite',
        },
      }],
      terminalOutcomes: [],
    };
    const competency = makeCompetency({
      prerequisiteCompetencyRefs: ['COMP-PREREQ-01'],
      diagnosticCandidateRefs: [onlineProbeRef, prerequisiteProbeRef],
      eligibleQuestionRefs: [anchorRef, onlineProbeRef, prerequisiteProbeRef],
    });
    const resolver = new DiagnosticResolver(makeRepo({
      competency,
      path,
      pedagogies: {
        [anchorRef]: makePedagogy(anchorRef, [], false),
        [prerequisiteProbeRef]: makePedagogy(prerequisiteProbeRef, [], false),
        [onlineProbeRef]: makePedagogy(onlineProbeRef, [], false),
      },
      links: {
        [anchorRef]: makeLink(anchorRef),
        [prerequisiteProbeRef]: makeLink(prerequisiteProbeRef, 'primary', 'COMP-PREREQ-01'),
        [onlineProbeRef]: makeLink(onlineProbeRef),
      },
      presentations: {
        [prerequisiteProbeRef]: makePresentation(prerequisiteProbeRef),
        [onlineProbeRef]: makePresentation(onlineProbeRef),
      },
    }));

    const result = await resolver.resolveDiagnostic(makeAttempt({ questionRef: anchorRef }));

    expect(result.diagnosisKind).toBe('unknown');
    expect(result.needsProbe).toBe(true);
    expect(result.probeQuestionRef).toBe(prerequisiteProbeRef);
  });
});
