import { describe, it, expect, beforeEach } from 'vitest';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import type { PBLCompetency, PBLCase, PBLTransferSet, PBLDiagnosticPath, QuestionPedagogy, PBLQuestionPresentation } from '../../../types/pbl';

describe('PBLEngine Full Flow Integration', () => {
  let engine: PBLEngine;
  let repo: PBLRepository;

  const mockComp: PBLCompetency = {
    schemaVersion: '1.0.0',
    competencyId: 'COMP-A10-G05-01',
    lessonId: 'A10',
    unitId: 'IP-A10-G05',
    title: 'Competência: Crase com Nomes de Lugar',
    description: 'Domínio da regra de crase em topônimos.',
    pedagogicalDomain: 'norma_culta',
    bloomLevel: 'aplicacao',
    learningObjectiveRefs: ['LO-A10-G05-01'],
    conceptRefs: ['KB-A10-G05-CRASE-001'],
    ruleRefs: ['RULE-IP-A10-G05-001'],
    procedureRefs: ['PROC-IP-A10-G05-001'],
    contrastRefs: ['CONTRAST-IP-A10-G05-001'],
    examTrapRefs: ['WARN-IP-A10-G05-001'],
    misconceptionRefs: ['MISC-CRASE-01'],
    prerequisiteCompetencyRefs: ['COMP-A10-G01-01'],
    eligibleQuestionRefs: ['OQ-A10-aula10.q0010'],
    anchorCandidateRefs: ['OQ-A10-aula10.q0010'],
    diagnosticCandidateRefs: ['OQ-A10-aula10.q0010'],
    transferCandidateRefs: ['OQ-A10-aula10.q0012'],
    validationCandidateRefs: ['OQ-A10-aula10.q0015'],
    questionCount: 4,
  };

  const mockCase: PBLCase = {
    schemaVersion: '1.0.0',
    caseId: 'PBL-CASE-A10-G05-01',
    competencyRef: 'COMP-A10-G05-01',
    unitRef: 'IP-A10-G05',
    title: 'Caso Problema: Crase com Nomes de Lugar',
    pedagogicalRole: 'anchor',
    anchorQuestionRef: 'OQ-A10-aula10.q0010',
    questionStem: 'Julgue o item sobre crase em "Vou a Roma dos césares".',
    options: [{ label: 'Certo', text: 'Certo' }, { label: 'Errado', text: 'Errado' }],
    officialAnswer: 'Certo',
    learningObjectiveRefs: ['LO-A10-G05-01'],
    targetConceptRefs: ['KB-A10-G05-CRASE-001'],
    primaryDecisiveRuleRef: 'RULE-IP-A10-G05-001',
    decisiveRuleRefs: ['RULE-IP-A10-G05-001'],
    procedureRef: 'PROC-IP-A10-G05-001',
    solutionStrategy: {
      stepByStepAlgorithm: ['1. Localizar o topônimo', '2. Aplicar o teste "Vou a, volto de/da"'],
      stoppingCondition: 'Confirmação da regra',
      formulasOrRulesApplied: ['RULE-IP-A10-G05-001'],
    },
    cognitiveDiagnostic: {
      primaryExamTrapRef: 'WARN-IP-A10-G05-001',
      associatedMisconceptionRef: 'MISC-CRASE-01',
      triggerCondition: 'Esquecer da especificação do nome de lugar',
      errorPattern: 'Generalização indevida de Roma sem crase',
      correctiveGuidance: 'Verificar se o topônimo está determinado',
      distractorBreakdown: [],
    },
    prerequisiteRefs: ['COMP-A10-G01-01'],
    transferSetRef: 'PBL-XFER-A10-G05-01',
    diagnosticPathRef: 'PBL-DIAG-A10-G05-01',
    validationQuestionRefs: ['OQ-A10-aula10.q0015'],
  };

  const mockQP: QuestionPedagogy = {
    schemaVersion: '3.0.0',
    questionPedagogyId: 'QPED-OQ-A10-aula10.q0010',
    officialQuestionRef: 'OQ-A10-aula10.q0010',
    lessonId: 'A10',
    primaryUnitRef: 'IP-A10-G05',
    allUnitRefs: ['IP-A10-G05'],
    targetLearningObjectiveRefs: ['LO-A10-G05-01'],
    testedConceptRefs: ['KB-A10-G05-CRASE-001'],
    primaryDecisiveRuleRef: 'RULE-IP-A10-G05-001',
    decisiveRuleRefs: ['RULE-IP-A10-G05-001'],
    supportingRuleRefs: [],
    procedureRefs: ['PROC-IP-A10-G05-001'],
    contrastRefs: ['CONTRAST-IP-A10-G05-001'],
    examTrapRefs: ['WARN-IP-A10-G05-001'],
    misconceptionRefs: ['MISC-CRASE-01'],
    prerequisiteRefs: [],
    difficulty: 'medio',
    cognitiveDemand: 'analise_estrutural',
    solutionStrategy: [
      { stepNumber: 1, action: 'Localizar topônimo', rationale: 'Isolar termo' },
      { stepNumber: 2, action: 'Aplicar teste Vou a/Volto da', rationale: 'Critério canônico' }
    ],
    distractorAnalysis: [
      {
        label: 'Julgamento',
        optionText: 'Assertiva',
        isCorrect: true,
        criterionOrRuleRef: 'RULE-IP-A10-G05-001',
        refutation: 'Item correto pois Roma está especificada por "dos césares".'
      }
    ],
    errorDiagnosticPotential: {
      score: 0.85,
      diagnosable: true,
      likelyTrapRefs: ['WARN-IP-A10-G05-001'],
      likelyMisconceptionRefs: ['MISC-CRASE-01'],
      diagnosticDiscriminator: 'Detecção de especificação de topônimo'
    },
    pblSuitability: {
      anchor: 0.90,
      diagnostic: 0.40,
      transfer: 0.70,
      validation: 0.85,
      primaryRole: 'anchor'
    }
  };

  const mockXfer: PBLTransferSet = {
    schemaVersion: '1.0.0',
    transferSetId: 'PBL-XFER-A10-G05-01',
    competencyRef: 'COMP-A10-G05-01',
    primaryCaseRef: 'PBL-CASE-A10-G05-01',
    targetSkill: 'Crase com topônimos',
    targetConceptRefs: ['KB-A10-G05-CRASE-001'],
    procedureRef: 'PROC-IP-A10-G05-001',
    transferDimensions: ['exam_board_variance'],
    items: [
      {
        itemOrder: 1,
        officialQuestionRef: 'OQ-A10-aula10.q0012',
        transferType: 'near_transfer',
        examBoard: 'FGV',
        difficulty: 'medio',
        cognitiveDelta: 'Variação para FGV com outro nome de lugar determinado.',
        expectedObstacle: 'Reconhecer a especificação.',
      }
    ],
    masteryCriteria: {
      minPassingScore: 0.75,
      consecutiveCorrectRequired: 1,
    }
  };

  const mockTransferQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0012',
    questionType: 'true_false',
    prompt: 'O nome de lugar determinado admite crase no contexto apresentado.',
    options: [],
    correctAnswer: 'correct',
    examBoard: 'FGV',
  };

  const mockDiag: PBLDiagnosticPath = {
    schemaVersion: '1.0.0',
    pathId: 'PBL-DIAG-A10-G05-01',
    competencyRef: 'COMP-A10-G05-01',
    title: 'Trilha Diagnóstica',
    unitRef: 'IP-A10-G05',
    targetConceptRef: 'KB-A10-G05-CRASE-001',
    entryNodeId: 'NODE-01',
    nodes: [
      {
        nodeId: 'NODE-01',
        questionRef: 'OQ-A10-aula10.q0010',
        nodeType: 'entry_probe',
        onCorrect: {
          nextAction: 'graduate_path',
          feedbackMessage: 'Correto!',
        },
        onIncorrect: {
          detectedMisconceptionRef: 'MISC-CRASE-01',
          triggeredTrapRef: 'WARN-IP-A10-G05-001',
          correctiveMicroLesson: 'Atenção à regra de topônimos especificados.',
          nextAction: 'remedial_instruction',
        }
      }
    ],
    terminalOutcomes: []
  };

  beforeEach(() => {
    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [mockComp],
      cases: [mockCase],
      transferSets: [mockXfer],
      diagnosticPaths: [mockDiag],
      questionPedagogyMap: { 'OQ-A10-aula10.q0010': mockQP },
      questionPresentations: { [mockTransferQuestion.questionRef]: mockTransferQuestion },
    });
    engine = new PBLEngine(repo);
  });

  it('should start a session and plan target competencies', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });

    expect(session.sessionId).toBeDefined();
    expect(session.currentCompetencyRef).toBe('COMP-A10-G05-01');
    expect(session.phase).toBe('problem');
    expect(session.status).toBe('active');
  });

  it('should route an initial correct attempt directly to transfer', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });

    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: 'OQ-A10-aula10.q0010',
      competencyRef: 'COMP-A10-G05-01',
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 10000,
    });

    expect(result.attempt.isCorrect).toBe(true);
    expect(result.attempt.evaluation).toBe('strong_correct');
    expect(result.nextAction.type).toBe('request_transfer');
    expect(result.session.phase).toBe('diagnostic');
    expect(result.session.currentTransferItem?.officialQuestionRef).toBe(mockTransferQuestion.questionRef);
    expect(engine.continueAfterDiagnostic(result.session).phase).toBe('transfer');
    expect(result.session.masterySnapshot['COMP-A10-G05-01'].score).toBeGreaterThan(0.1);
  });

  it('should route an initial error attempt to intervention and diagnosis', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });

    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: 'OQ-A10-aula10.q0010',
      competencyRef: 'COMP-A10-G05-01',
      userAnswer: 'Errado',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 12000,
    });

    expect(result.attempt.isCorrect).toBe(false);
    expect(result.attempt.evaluation).toBe('high_confidence_error');
    expect(result.diagnostic).toBeDefined();
    expect(result.diagnostic?.misconceptionRefs).toContain('MISC-CRASE-01');
    expect(result.intervention).toBeDefined();
    expect(result.intervention?.procedureSteps.length).toBeGreaterThan(0);
    expect(result.session.phase).toBe('diagnostic');
    expect(result.attempt.detectedMisconceptionRefs).toContain('MISC-CRASE-01');
    expect(result.session.sessionStats.misconceptionsCaught).toBe(1);
  });
});
