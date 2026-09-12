import { describe, it, expect, beforeEach } from 'vitest';
import { PBLEngine } from '../../engine/PBLEngine';
import { PBLRepository } from '../../data/PBLRepository';
import type {
  PBLCompetency,
  PBLCase,
  PBLTransferSet,
  PBLDiagnosticPath,
  PBLQuestionPresentation,
  QuestionCompetencyLink,
} from '../../../../types/pbl';
import type { PBLTutorTurn } from '../../../../types/pblTutor';

describe('PBLEngine Tutor Mode Conduction Flow', () => {
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
    prerequisiteCompetencyRefs: [],
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
    decisiveRuleRefs: ['RULE-IP-A10-G05-001'],
    procedureRef: 'PROC-IP-A10-G05-001',
    solutionStrategy: {
      stepByStepAlgorithm: ['1. Localizar o topônimo', '2. Aplicar teste'],
      stoppingCondition: 'Confirmação da regra',
      formulasOrRulesApplied: ['RULE-IP-A10-G05-001'],
    },
    cognitiveDiagnostic: {
      triggerCondition: 'Topônimo especificado',
      errorPattern: 'Generalização indevida',
      correctiveGuidance: 'Verificar especificação',
      distractorBreakdown: [],
    },
    prerequisiteRefs: [],
    transferSetRef: 'PBL-XFER-A10-G05-01',
    diagnosticPathRef: 'PBL-DIAG-A10-G05-01',
    validationQuestionRefs: ['OQ-A10-aula10.q0015'],
  };

  const mockAnchorQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0010',
    questionType: 'true_false',
    prompt: mockCase.questionStem,
    options: [{ label: 'Certo', text: 'Certo' }, { label: 'Errado', text: 'Errado' }],
    correctAnswer: 'Certo',
  };

  const mockTransferQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0012',
    questionType: 'true_false',
    prompt: 'Topônimo determinado admite crase.',
    options: [{ label: 'Certo', text: 'Certo' }, { label: 'Errado', text: 'Errado' }],
    correctAnswer: 'Certo',
  };

  const mockSecondTransferQuestion: PBLQuestionPresentation = {
    questionRef: 'OQ-A10-aula10.q0013',
    questionType: 'true_false',
    prompt: 'Em "Voltei à Roma dos césares", admite crase.',
    options: [{ label: 'Certo', text: 'Certo' }, { label: 'Errado', text: 'Errado' }],
    correctAnswer: 'Certo',
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
        cognitiveDelta: 'Variação com outro nome de lugar.',
        expectedObstacle: 'Reconhecer especificação.',
        validationStatus: 'audited',
      },
      {
        itemOrder: 2,
        officialQuestionRef: 'OQ-A10-aula10.q0013',
        transferType: 'far_transfer',
        examBoard: 'CEBRASPE',
        difficulty: 'medio',
        cognitiveDelta: 'Novo topônimo em formulação distinta.',
        expectedObstacle: 'Aplicar teste sem depender do exemplo anterior.',
        validationStatus: 'audited',
      },
    ],
    masteryCriteria: {
      minPassingScore: 0.75,
      consecutiveCorrectRequired: 1,
    },
  };

  const mockDiag: PBLDiagnosticPath = {
    schemaVersion: '1.0.0',
    pathId: 'PBL-DIAG-A10-G05-01',
    competencyRef: 'COMP-A10-G05-01',
    title: 'Trilha Diagnóstica',
    unitRef: 'IP-A10-G05',
    targetConceptRef: 'KB-A10-G05-CRASE-001',
    entryNodeId: 'NODE-01',
    nodes: [],
    terminalOutcomes: [],
  };

  const mockQP = {
    schemaVersion: '3.0.0',
    questionPedagogyId: 'QPED-OQ-A10-aula10.q0010',
    officialQuestionRef: 'OQ-A10-aula10.q0010',
    lessonId: 'A10',
    primaryUnitRef: 'IP-A10-G05',
    allUnitRefs: ['IP-A10-G05'],
    targetLearningObjectiveRefs: ['LO-A10-G05-01'],
    testedConceptRefs: ['KB-A10-G05-CRASE-001'],
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
    solutionStrategy: [],
    distractorAnalysis: [],
  };

  const mockLink = (questionRef: string, role: 'anchor' | 'transfer'): QuestionCompetencyLink => ({
    schemaVersion: '3.0.0',
    linkId: `LINK-${questionRef}`,
    officialQuestionRef: questionRef,
    competencyId: mockComp.competencyId,
    unitId: mockComp.unitId,
    lessonId: mockComp.lessonId,
    prerequisiteRefs: [],
    pblSuitabilityScores: { anchor: 1, diagnostic: 0.7, transfer: 1, validation: 0.7, primaryRole: role },
    assignedPBLRole: role,
    diagnosticPotential: 0.8,
    semanticReview: {
      status: 'approved',
      reviewedAt: '2026-08-25T00:00:00-03:00',
      reason: 'Homologado para teste de fluxo',
    },
  });

  beforeEach(() => {
    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: [mockComp],
      cases: [mockCase],
      transferSets: [mockXfer],
      diagnosticPaths: [mockDiag],
      questionPedagogyMap: { [mockAnchorQuestion.questionRef]: mockQP as any },
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

  it('initializes session with conductionMode = tutor when requested', async () => {
    const session = await engine.startSession({
      userId: 'aluno_tutor_1',
      mode: 'guided',
      targetLessonId: 'A10',
      conductionMode: 'tutor',
    });

    expect(session.conductionMode).toBe('tutor');
    expect(session.phase).toBe('problem');
    expect(session.tutorEpisodes).toBeDefined();
  });

  it('routes an incorrect attempt directly to tutor phase and creates an episode', async () => {
    const session = await engine.startSession({
      userId: 'aluno_tutor_2',
      mode: 'guided',
      targetLessonId: 'A10',
      conductionMode: 'tutor',
    });

    const result = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      userAnswer: 'Errado',
      correctAnswer: 'Certo',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 8000,
    });

    expect(result.attempt.isCorrect).toBe(false);
    expect(result.session.phase).toBe('tutor');
    expect(result.session.currentTutorEpisodeId).toBeDefined();

    const episodeId = result.session.currentTutorEpisodeId!;
    const episode = result.session.tutorEpisodes?.[episodeId];

    expect(episode).toBeDefined();
    expect(episode?.questionRef).toBe(mockAnchorQuestion.questionRef);
    expect(episode?.competencyRef).toBe(mockComp.competencyId);
    expect(episode?.attemptStage).toBe('initial');
    expect(episode?.initialUserAnswer).toBe('Errado');
    expect(episode?.assistanceLevel).toBe('none');
    expect(episode?.resolved).toBe(false);
  });

  it('records tutor turns, manages assistance level escalation and latency compensation', async () => {
    let session = await engine.startSession({
      userId: 'aluno_tutor_3',
      mode: 'guided',
      targetLessonId: 'A10',
      conductionMode: 'tutor',
    });

    const episode = engine.startTutorEpisode(session, {
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      attemptStage: 'initial',
      initialUserAnswer: 'Errado',
    });

    expect(episode.assistanceLevel).toBe('none');

    // Turn 1: Aluno pergunta algo investigativo sem pedir resposta
    const turn1: PBLTutorTurn = {
      turnId: 't1',
      role: 'student',
      content: 'Por que Roma não leva crase aqui?',
      timestamp: new Date().toISOString(),
      studentAssistanceRequested: false,
    };
    session = engine.recordTutorTurn(session, episode.episodeId, turn1);

    const tutorTurn1: PBLTutorTurn = {
      turnId: 't2',
      role: 'tutor',
      content: 'Observe se Roma está pura ou acompanhada de um modificador ("dos césares").',
      timestamp: new Date().toISOString(),
      intent: 'explain_rule',
      executionMetadata: {
        model: 'gemini-3.1-flash-lite',
        durationMs: 1500,
      },
    };
    session = engine.recordTutorTurn(session, episode.episodeId, tutorTurn1);

    const updatedEpisode = session.tutorEpisodes![episode.episodeId];
    expect(updatedEpisode.turns.length).toBe(2);
    expect(updatedEpisode.assistanceLevel).toBe('none');
    expect(updatedEpisode.totalAiLatencyMs).toBe(1500);

    // Turn 2: Aluno pede socorro explícito
    const turn2: PBLTutorTurn = {
      turnId: 't3',
      role: 'student',
      content: 'Professor, me dá uma dica mais direta.',
      timestamp: new Date().toISOString(),
      studentAssistanceRequested: true,
    };
    session = engine.recordTutorTurn(session, episode.episodeId, turn2);

    const tutorTurn2: PBLTutorTurn = {
      turnId: 't4',
      role: 'tutor',
      content: 'Aplique o macete: Vou a Roma, volto de Roma (sem crase). Vou à Roma dos césares, volto da Roma dos césares (com crase!).',
      timestamp: new Date().toISOString(),
      intent: 'contrast_options',
      notebookDraft: {
        title: 'Crase com Nomes de Lugar Especificados',
        triggerCondition: 'Topônimo modificado por adjunto restritivo',
        decisionRule: 'Se "volto da", crase há; se "volto de", crase pra quê?',
        contrastExample: 'Vou a Roma (volto de) vs Vou à Roma dos césares (volto da)',
      },
      executionMetadata: {
        model: 'gemini-3.1-flash-lite',
        durationMs: 1800,
      },
    };
    session = engine.recordTutorTurn(session, episode.episodeId, tutorTurn2);

    const finalEpisode = session.tutorEpisodes![episode.episodeId];
    expect(finalEpisode.assistanceLevel).toBe('partial');
    expect(session.interventionAssistance?.[mockComp.competencyId]).toBe('partial');
    expect(finalEpisode.notebookDraft).toBeDefined();
    expect(finalEpisode.notebookDraft?.title).toContain('Crase com Nomes de Lugar');
    expect(finalEpisode.totalAiLatencyMs).toBe(3300);
  });

  it('concludes tutor episode with try_same action and returns to problem solving', async () => {
    let session = await engine.startSession({
      userId: 'aluno_tutor_4',
      mode: 'guided',
      targetLessonId: 'A10',
      conductionMode: 'tutor',
    });

    const episode = engine.startTutorEpisode(session, {
      questionRef: mockAnchorQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      attemptStage: 'initial',
    });

    session = await engine.concludeTutorEpisode(session, episode.episodeId, 'try_same');

    expect(session.phase).toBe('problem');
    expect(session.tutorEpisodes![episode.episodeId].resolved).toBe(true);
  });

  it('concludes tutor episode with proceed_transfer action', async () => {
    let session = await engine.startSession({
      userId: 'aluno_tutor_5',
      mode: 'guided',
      targetLessonId: 'A10',
      conductionMode: 'tutor',
    });

    const episode = engine.startTutorEpisode(session, {
      questionRef: mockTransferQuestion.questionRef,
      competencyRef: mockComp.competencyId,
      attemptStage: 'transfer',
    });

    session = await engine.concludeTutorEpisode(session, episode.episodeId, 'proceed_transfer');

    expect(session.phase).toBe('transfer');
    expect(session.tutorEpisodes![episode.episodeId].resolved).toBe(true);
  });
  it('preserva ajuda máxima ao retomar o item e não avalia a resposta como independente', async () => {
    let session = await engine.startSession({ userId: 'assisted-student', mode: 'guided', targetLessonId: 'A10', conductionMode: 'tutor' });
    const episode = engine.startTutorEpisode(session, { questionRef: mockAnchorQuestion.questionRef, competencyRef: mockComp.competencyId, attemptStage: 'initial', assistanceRequested: true, initialUserAnswer: 'Certo' });
    expect(episode.attemptId).toBeUndefined();
    expect(episode.initialUserAnswer).toBeUndefined();
    engine.recordTutorAssistance(session, episode.episodeId, 'full');
    engine.recordTutorTurn(session, episode.episodeId, { turnId: 'help', role: 'student', content: 'Como aplicar?', timestamp: new Date().toISOString(), studentAssistanceRequested: true });
    expect(episode.assistanceLevel).toBe('full');
    expect(session.interventionAssistance?.[mockComp.competencyId]).toBe('full');
    session.currentQuestionRef = mockTransferQuestion.questionRef;
    session = await engine.concludeTutorEpisode(session, episode.episodeId, 'try_same');
    expect(session.currentQuestionRef).toBe(mockAnchorQuestion.questionRef);
    const result = await engine.submitAttempt(session, { sessionId: session.sessionId, questionRef: mockAnchorQuestion.questionRef, competencyRef: mockComp.competencyId, userAnswer: 'Certo', correctAnswer: 'Certo', confidence: 'high', stage: 'initial', responseTimeMs: 1000, assistanceLevel: 'none' });
    expect(result.attempt.assistanceLevel).toBe('full');
    expect(result.session.masterySnapshot[mockComp.competencyId]?.learningState).not.toBe('retention_confirmed');
  });

  it('fixa a identidade da tentativa e do diagnóstico ao iniciar o episódio', async () => {
    const session = await engine.startSession({ userId: 'episode-student', mode: 'guided', targetLessonId: 'A10', conductionMode: 'tutor' });
    const result = await engine.submitAttempt(session, { sessionId: session.sessionId, questionRef: mockAnchorQuestion.questionRef, competencyRef: mockComp.competencyId, userAnswer: 'Errado', correctAnswer: 'Certo', confidence: 'high', stage: 'initial', responseTimeMs: 1000 });
    const episode = result.session.tutorEpisodes![result.session.currentTutorEpisodeId!];
    expect(episode.attemptId).toBe(result.attempt.attemptId);
    expect(episode.diagnostic?.questionRef).toBe(result.attempt.questionRef);
    expect(episode.intervention?.competencyRef).toBe(result.attempt.competencyRef);
  });

  it('encerra apoio sem atribuir domínio e permite concluir a reflexão', async () => {
    let session = await engine.startSession({ userId: 'reflection-student', mode: 'guided', targetLessonId: 'A10', conductionMode: 'tutor' });
    const episode = engine.startTutorEpisode(session, { questionRef: mockAnchorQuestion.questionRef, competencyRef: mockComp.competencyId, attemptStage: 'initial' });
    session = await engine.concludeTutorEpisode(session, episode.episodeId, 'proceed_reflection');
    expect(session.pendingNextAction?.outcome).toBe('needs_review');
    session = engine.completeReflection(session, { decision: 'needs_review', note: 'Preciso recuperar a condição.', suggestedRule: '' });
    expect(session.phase).toBe('completed');
    expect(session.competencyOutcomes?.[mockComp.competencyId]).toBe('needs_review');
  });

  it('desduplica turnos idênticos consecutivos no motor para evitar repetição de orientações', async () => {
    let session = await engine.startSession({ userId: 'dedup-student', mode: 'guided', targetLessonId: 'A10', conductionMode: 'tutor' });
    const episode = engine.startTutorEpisode(session, { questionRef: mockAnchorQuestion.questionRef, competencyRef: mockComp.competencyId, attemptStage: 'initial' });
    const turn1: PBLTutorTurn = {
      turnId: 'turn-1',
      role: 'tutor',
      content: 'Identifique o que o comando pede e qual relação gramatical deve ser examinada.',
      timestamp: new Date().toISOString(),
      intent: 'explain_rule',
    };
    session = engine.recordTutorTurn(session, episode.episodeId, turn1);
    expect(session.tutorEpisodes![episode.episodeId].turns).toHaveLength(1);

    // Tentativa de adicionar turno idêntico consecutivo com ID diferente
    const turn2: PBLTutorTurn = {
      turnId: 'turn-2',
      role: 'tutor',
      content: '  Identifique o que o comando pede e qual relação gramatical deve ser examinada.  ',
      timestamp: new Date().toISOString(),
      intent: 'explain_rule',
    };
    session = engine.recordTutorTurn(session, episode.episodeId, turn2);
    // Deve manter exatamente 1 turno
    expect(session.tutorEpisodes![episode.episodeId].turns).toHaveLength(1);
  });
});
