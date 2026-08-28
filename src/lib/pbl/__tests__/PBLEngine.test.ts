import { describe, it, expect, beforeEach } from 'vitest';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import { TransferSelector } from '../engine/TransferSelector';
import type { CompetencyMastery, PBLCompetency, PBLCase, PBLTransferSet, PBLDiagnosticPath, QuestionCompetencyLink, QuestionPedagogy, PBLQuestionPresentation } from '../../../types/pbl';

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
    transferCandidateRefs: ['OQ-A10-aula10.q0012', 'OQ-A10-aula10.q0013'],
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
    causalDiagnosticReview: {
      status: 'dual_pass_reviewed',
      method: 'gemini_closed_context_dual_pass',
      reviewedAt: '2026-08-26T00:00:00-03:00',
      unitRefs: ['IP-A10-G05'],
    },
    solutionStrategy: [
      { stepNumber: 1, action: 'Localizar topônimo', rationale: 'Isolar termo' },
      { stepNumber: 2, action: 'Aplicar teste Vou a/Volto da', rationale: 'Critério canônico' }
    ],
    distractorAnalysis: [
      {
        label: 'Certo',
        optionText: 'Certo',
        isCorrect: true,
        criterionOrRuleRef: 'RULE-IP-A10-G05-001',
        refutation: 'Item correto pois Roma está especificada por "dos césares".'
      },
      {
        label: 'Errado',
        optionText: 'Errado',
        isCorrect: false,
        causalStatus: 'causal_candidate',
        errorMechanism: 'polarity_inversion',
        mappingConfidence: 0.85,
        likelyMisconceptionRef: 'MISC-CRASE-01',
        triggeredTrapRef: 'WARN-IP-A10-G05-001',
        criterionOrRuleRef: 'RULE-IP-A10-G05-001',
        refutation: 'O item está correto, logo marcar Errado é um erro de julgamento de regra.'
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
        validationStatus: 'audited',
      },
      {
        itemOrder: 2,
        officialQuestionRef: 'OQ-A10-aula10.q0013',
        transferType: 'far_transfer',
        examBoard: 'CEBRASPE',
        difficulty: 'medio',
        cognitiveDelta: 'Novo topônimo em formulação distinta.',
        expectedObstacle: 'Aplicar o teste sem depender do exemplo anterior.',
        validationStatus: 'audited',
      },
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

  const mockAnchorQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0010',
    questionType: 'true_false',
    prompt: mockCase.questionStem,
    options: [],
    correctAnswer: 'Certo',
  };

  const mockSecondTransferQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0013',
    questionType: 'true_false',
    prompt: 'Em “Voltei à Roma dos césares”, a especificação do topônimo admite o acento grave.',
    options: [],
    correctAnswer: 'Certo',
    examBoard: 'CEBRASPE',
  };

  const mockLink = (questionRef: string, role: 'anchor' | 'transfer'): QuestionCompetencyLink => {
    const roleScores = {
      anchor: role === 'anchor' ? 0.95 : 0.7,
      diagnostic: 0.7,
      transfer: role === 'transfer' ? 0.95 : 0.7,
      validation: 0.7,
    };
    return {
      schemaVersion: '3.0.0',
      linkId: `LINK-${questionRef}`,
      officialQuestionRef: questionRef,
      competencyId: mockComp.competencyId,
      unitId: mockComp.unitId,
      lessonId: mockComp.lessonId,
      prerequisiteRefs: [],
      pblSuitabilityScores: { ...roleScores, primaryRole: role },
      assignedPBLRole: role,
      diagnosticPotential: 0.8,
      semanticReview: {
        status: 'approved',
        reviewedAt: '2026-08-25T00:00:00-03:00',
        reason: 'Fixture editorial aprovada.',
      },
      competencyAssignments: [{
        assignmentId: `${questionRef}::${mockComp.competencyId}`,
        competencyId: mockComp.competencyId,
        unitId: mockComp.unitId,
        lessonId: mockComp.lessonId,
        relation: 'primary',
        semanticStatus: 'approved',
        allowedRoles: ['anchor', 'diagnostic', 'transfer', 'validation'],
        roleScores,
        evidenceRefs: ['TEST_FIXTURE'],
        reviewMethod: 'editorial',
        reviewedAt: '2026-08-25T00:00:00-03:00',
        reason: 'Fixture editorial aprovada.',
      }],
    };
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
      questionLinksMap: {
        [mockAnchorQuestion.questionRef]: mockLink(mockAnchorQuestion.questionRef, 'anchor'),
        [mockTransferQuestion.questionRef]: mockLink(mockTransferQuestion.questionRef, 'transfer'),
        [mockSecondTransferQuestion.questionRef]: mockLink(mockSecondTransferQuestion.questionRef, 'transfer'),
      },
      questionPresentations: {
        [mockAnchorQuestion.questionRef]: mockAnchorQuestion,
        [mockTransferQuestion.questionRef]: mockTransferQuestion,
        [mockSecondTransferQuestion.questionRef]: mockSecondTransferQuestion,
      },
    });
    engine = new PBLEngine(repo);
  });

  const delayedMastery = (): CompetencyMastery => ({
    competencyId: mockComp.competencyId,
    unitId: mockComp.unitId,
    lessonId: mockComp.lessonId,
    score: 0.6,
    level: 'competent',
    learningState: 'immediate_transfer_confirmed',
    totalAttempts: 3,
    correctAttempts: 3,
    transferSuccessCount: 1,
    activeMisconceptions: [],
    resolvedMisconceptions: [],
    lastPracticedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    nextReviewRecommendedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    reviewIntervalDays: 2,
    successfulDelayedRetrievals: 0,
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
    expect(result.diagnostic?.diagnosisKind).toBe('mapped_error_hypothesis');
    expect(result.diagnostic?.candidateMisconceptionRefs).toContain('MISC-CRASE-01');
    expect(result.intervention).toBeDefined();
    expect(result.intervention?.procedureSteps.length).toBeGreaterThan(0);
    expect(result.session.phase).toBe('diagnostic');
  });

  it('should show diagnostic feedback after a transfer error before advancing', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });
    const initial = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1000,
    });
    const transferSession = engine.continueAfterDiagnostic(initial.session);
    const transfer = await engine.submitAttempt(transferSession, {
      sessionId: session.sessionId,
      questionRef: mockTransferQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Errado',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'transfer',
      transferType: 'near_transfer',
      responseTimeMs: 1000,
    });

    expect(transfer.session.phase).toBe('diagnostic');
    expect(transfer.nextAction.feedbackMessage).toMatch(/retome o critério/i);
    expect(engine.continueAfterDiagnostic(transfer.session).phase).toBe('intervention');
  });

  it('does not confirm transfer from a low-confidence correct answer', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });
    const initial = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1_000,
    });
    const transfer = await engine.submitAttempt(engine.continueAfterDiagnostic(initial.session), {
      sessionId: session.sessionId,
      questionRef: mockTransferQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'correct',
      correctAnswer: 'correct',
      confidence: 'low',
      stage: 'transfer',
      transferType: 'near_transfer',
      responseTimeMs: 1_000,
    });

    expect(transfer.attempt.evaluation).toBe('fragile_correct');
    expect(transfer.nextAction.type).not.toBe('complete_session');
    expect(transfer.nextAction.outcome).not.toBe('transfer_confirmed');
  });

  it('does not confirm retention when delayed retrieval used assistance', async () => {
    const mastery = delayedMastery();
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'review',
      targetCompetencyId: mockComp.competencyId,
      currentMasteryMap: { [mockComp.competencyId]: mastery },
    });
    const initial = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      assistanceLevel: 'full',
      responseTimeMs: 1_000,
    });
    const transfer = await engine.submitAttempt(engine.continueAfterDiagnostic(initial.session), {
      sessionId: session.sessionId,
      questionRef: mockTransferQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'correct',
      correctAnswer: 'correct',
      confidence: 'high',
      stage: 'transfer',
      transferType: 'near_transfer',
      responseTimeMs: 1_000,
    });

    expect(initial.attempt.isDelayedRetrieval).toBe(true);
    expect(initial.attempt.assistanceLevel).toBe('full');
    expect(transfer.nextAction.outcome).not.toBe('retention_confirmed');
    expect(transfer.nextAction.type).not.toBe('complete_session');
  });

  it('confirms retention only after delayed unassisted retrieval and transfer', async () => {
    const mastery = delayedMastery();
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'review',
      targetCompetencyId: mockComp.competencyId,
      currentMasteryMap: { [mockComp.competencyId]: mastery },
    });
    const initial = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1_000,
    });
    const transfer = await engine.submitAttempt(engine.continueAfterDiagnostic(initial.session), {
      sessionId: session.sessionId,
      questionRef: mockTransferQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'correct',
      correctAnswer: 'correct',
      confidence: 'high',
      stage: 'transfer',
      transferType: 'near_transfer',
      responseTimeMs: 1_000,
    });

    expect(initial.attempt.isDelayedRetrieval).toBe(true);
    expect(transfer.nextAction).toMatchObject({
      type: 'complete_session',
      outcome: 'retention_confirmed',
    });
    const completed = engine.completeReflection(transfer.session, {
      decision: 'own_rule',
      note: 'Primeiro aplicarei o teste decisivo ao novo contexto.',
      suggestedRule: 'Aplicar o teste do topônimo antes de decidir pela crase.',
      revealedSuggestedRule: true,
    });
    expect(completed.masterySnapshot[mockComp.competencyId].learningState).toBe('retention_confirmed');
    expect(completed.masterySnapshot[mockComp.competencyId].retentionConfirmedAt).toBeDefined();
  });

  it('stops at a safe point when the session budget is reached', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });
    session.targetCompetencyRefs = [mockComp.competencyId, 'COMP-FUTURE'];
    session.wallTimeMs = session.sessionBudgetMs;
    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Certo',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1_000,
    });

    expect(result.nextAction).toMatchObject({
      type: 'complete_session',
      outcome: 'needs_review',
    });
    expect(result.nextAction.reason).toMatch(/limite adaptativo/i);
    expect(result.nextAction.type).not.toBe('advance_competency');
    expect(engine.continueAfterDiagnostic(result.session).phase).toBe('reflection');
  });

  it('should accept “Ainda não sei” and route the competency to review', async () => {
    const session = await engine.startSession({
      userId: 'test_user',
      mode: 'guided',
      targetLessonId: 'A10',
    });
    session.phase = 'reflection';
    session.pendingNextAction = {
      type: 'complete_session',
      outcome: 'mastered',
      reason: 'Transferência concluída.',
    };

    const completed = engine.completeReflection(session, {
      decision: 'needs_review',
      note: '',
      suggestedRule: 'Aplicar o teste do topônimo antes de decidir pela crase.',
    });

    expect(completed.status).toBe('completed');
    expect(completed.competencyOutcomes?.[mockComp.competencyId]).toBe('needs_review');
    expect(completed.reflectionEntries?.[mockComp.competencyId].decision).toBe('needs_review');
  });

  it('prefers an audited transfer item that was not exposed recently', async () => {
    const selected = await engine.transferSelector.selectNextTransferItem(
      mockComp.competencyId,
      'strong_correct',
      0,
      undefined,
      [],
      true,
      'freshness-test',
      [mockTransferQuestion.questionRef],
    );

    expect(selected?.officialQuestionRef).toBe(mockSecondTransferQuestion.questionRef);
    expect(selected?.validationStatus).toBe('audited');
    expect(selected?.recentExposureFallback).not.toBe(true);
  });

  it('allows recent reuse only as unverified practice when no fresh transfer exists', async () => {
    const selected = await engine.transferSelector.selectNextTransferItem(
      mockComp.competencyId,
      'strong_correct',
      0,
      undefined,
      [],
      true,
      'reuse-test',
      [mockTransferQuestion.questionRef, mockSecondTransferQuestion.questionRef],
    );

    expect(selected?.recentExposureFallback).toBe(true);
    expect(selected?.validationStatus).toBe('unverified');
  });

  it('treats a different ID with the same prompt as recent exposure', async () => {
    const duplicateRepo = new PBLRepository();
    duplicateRepo.loadDirectly({
      competencies: [mockComp],
      cases: [mockCase],
      transferSets: [mockXfer],
      questionLinksMap: {
        [mockTransferQuestion.questionRef]: mockLink(mockTransferQuestion.questionRef, 'transfer'),
        [mockSecondTransferQuestion.questionRef]: mockLink(mockSecondTransferQuestion.questionRef, 'transfer'),
      },
      questionPresentations: {
        [mockTransferQuestion.questionRef]: mockTransferQuestion,
        [mockSecondTransferQuestion.questionRef]: {
          ...mockSecondTransferQuestion,
          prompt: mockTransferQuestion.prompt,
        },
      },
    });

    const selected = await new TransferSelector(duplicateRepo).selectNextTransferItem(
      mockComp.competencyId,
      'strong_correct',
      0,
      undefined,
      [],
      true,
      'duplicate-prompt-test',
      [mockTransferQuestion.questionRef],
    );

    expect(selected?.validationStatus).toBe('unverified');
    expect(selected?.recentExposureFallback).toBe(true);
  });
});
