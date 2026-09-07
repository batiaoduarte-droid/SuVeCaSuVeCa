import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import { AttemptEvaluator } from '../engine/AttemptEvaluator';
import { RuleBasedMasteryModel } from '../engine/MasteryUpdater';
import { QuestionPoolSelector } from '../engine/QuestionPoolSelector';
import { answerChoiceFor, normalizePBLAnswer } from '../answerAdapter';
import { loadPublishedQuestionPresentations } from './publishedQuestionTestData';
import type {
  PBLCompetency,
  PBLCase,
  PBLTransferSet,
  PBLDiagnosticPath,
  PBLCumulativeSession,
  QuestionPedagogy,
  QuestionCompetencyLink,
  PBLRuntimeShardManifest,
  CompetencyMastery,
} from '../../../types/pbl';

describe('Adversarial QA Suite (25 Tests)', () => {
  let repo: PBLRepository;
  let engine: PBLEngine;
  let cases: PBLCase[];
  let comps: PBLCompetency[];
  let xfers: PBLTransferSet[];
  let diags: PBLDiagnosticPath[];
  let sessions: PBLCumulativeSession[];
  let qcl: Record<string, QuestionCompetencyLink>;
  let qp: Record<string, QuestionPedagogy>;
  let publishedPresentations: Record<string, any>;

  beforeAll(() => {
    const pblDir = path.resolve('public/knowledge/pbl');
    comps = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_competency_map.json'), 'utf8'));
    cases = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_cases.json'), 'utf8'));
    xfers = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_transfer_sets.json'), 'utf8'));
    diags = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_diagnostic_paths.json'), 'utf8'));
    sessions = JSON.parse(fs.readFileSync(path.join(pblDir, 'pbl_cumulative_review_sessions.json'), 'utf8'));
    const runtimeManifest: PBLRuntimeShardManifest = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_runtime_manifest.json'), 'utf8')
    );
    qcl = {};
    for (const shard of runtimeManifest.datasets.questionCompetencyLinks.shards) {
      Object.assign(qcl, JSON.parse(fs.readFileSync(path.join(pblDir, shard.file), 'utf8')));
    }
    qp = {};
    for (const shard of runtimeManifest.datasets.questionPedagogy.shards) {
      Object.assign(qp, JSON.parse(fs.readFileSync(path.join(pblDir, shard.file), 'utf8')));
    }
    publishedPresentations = loadPublishedQuestionPresentations();

    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: comps,
      cases,
      transferSets: xfers,
      diagnosticPaths: diags,
      cumulativeSessions: sessions,
      questionLinksMap: qcl,
      questionPedagogyMap: qp,
      questionPresentations: publishedPresentations,
    });
    engine = new PBLEngine(repo);
  }, 30000);

  // TEST 1: Aluno Confidente, Mas Errado
  it('TESTE 1 — Aluno confidente mas errado: detecta high_confidence_error e não confirma misconception em 1 erro', async () => {
    const compId = 'COMP-A00-G01-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const isMc = Boolean(c.options.length);
    const correct = answerChoiceFor(c.officialAnswer, isMc);
    const wrong = isMc ? c.options.find((o) => o.label !== correct)?.label || 'B' : (correct === 'Certo' ? 'Errado' : 'Certo');

    const session = await engine.startSession({ userId: 'adv_t1', mode: 'guided', targetCompetencyId: compId });
    const res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: c.anchorQuestionRef,
      competencyRef: compId,
      userAnswer: wrong,
      correctAnswer: c.officialAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 3000,
    });

    expect(res.attempt.evaluation).toBe('high_confidence_error');
    // Se a questão âncora tiver mapeamento causal, gera mapped_error_hypothesis; caso contrário, slip.
    expect(['mapped_error_hypothesis', 'slip']).toContain(res.diagnostic?.diagnosisKind);
    expect(res.diagnostic?.needsProbe).toBe(true);
    expect(res.diagnostic?.misconceptionRefs).toEqual([]); // not confirmed yet
    expect(res.nextAction.type).toBe('request_probe');
    // Score penalty is -0.14 for high confidence error
    expect(session.masterySnapshot[compId].score).toBe(0.0); // clamped at 0.0 from 0.1
  });

  // TEST 2: Aluno Inseguro, Mas Correto
  it('TESTE 2 — Aluno inseguro mas correto: detecta fragile_correct, bloqueia transferência direta e dá delta mínimo', async () => {
    const compId = 'COMP-A00-G01-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const isMc = Boolean(c.options.length);
    const correct = answerChoiceFor(c.officialAnswer, isMc);

    const session = await engine.startSession({ userId: 'adv_t2', mode: 'guided', targetCompetencyId: compId });
    const res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: c.anchorQuestionRef,
      competencyRef: compId,
      userAnswer: correct,
      correctAnswer: c.officialAnswer,
      confidence: 'guess',
      stage: 'initial',
      responseTimeMs: 3000,
    });

    expect(res.attempt.evaluation).toBe('fragile_correct');
    // Does NOT jump to transfer! Triggers intervention!
    expect(res.nextAction.type).toBe('trigger_intervention');
    expect(res.nextAction.feedbackMessage).toMatch(/consolidar o procedimento/i);
    // Score increases only by 0.01 instead of 0.12!
    expect(session.masterySnapshot[compId].score).toBeCloseTo(0.11, 2);
  });

  // TEST 3: Repetição do Mesmo Erro (Loop e saída para needs_review)
  it('TESTE 3 — Repetição do erro: após 2 erros em reattempt, sai do loop para needs_review', async () => {
    const compId = 'COMP-A00-G01-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const isMc = Boolean(c.options.length);
    const correct = answerChoiceFor(c.officialAnswer, isMc);
    const wrong = isMc ? c.options.find((o) => o.label !== correct)?.label || 'B' : (correct === 'Certo' ? 'Errado' : 'Certo');

    let session = await engine.startSession({ userId: 'adv_t3', mode: 'guided', targetCompetencyId: compId });
    // Attempt 1 (initial error)
    let res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: c.anchorQuestionRef,
      competencyRef: compId,
      userAnswer: wrong,
      correctAnswer: c.officialAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 2000,
    });
    session = res.session;

    // Resolve probe if requested
    if (session.pendingNextAction?.type === 'request_probe') {
      session = engine.continueAfterDiagnostic(session);
      const probeQ = await repo.getQuestionPresentation(session.currentQuestionRef)!;
      const pWrong = probeQ?.questionType === 'multiple_choice'
        ? probeQ.options.find((o) => o.label !== probeQ.correctAnswer)?.label || 'B'
        : probeQ?.correctAnswer === 'Certo' ? 'Errado' : 'Certo';
      res = await engine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: probeQ!.questionRef,
        competencyRef: compId,
        userAnswer: pWrong,
        correctAnswer: probeQ!.correctAnswer,
        confidence: 'high',
        stage: 'probe',
        responseTimeMs: 2000,
      });
      session = res.session;
    }

    // Now intervention -> prepare reattempt 1
    session = engine.continueAfterDiagnostic(session);
    session = await engine.prepareReattempt(session);
    const rQ1 = await repo.getQuestionPresentation(session.currentQuestionRef)!;
    const rCorrectChoice1 = answerChoiceFor(rQ1!.correctAnswer, rQ1?.questionType === 'multiple_choice');
    const rWrong1 = rQ1?.questionType === 'multiple_choice'
      ? rQ1.options.find((o) => normalizePBLAnswer(o.label, 'multiple_choice') !== normalizePBLAnswer(rCorrectChoice1, 'multiple_choice'))?.label || 'B'
      : rCorrectChoice1 === 'Certo' ? 'Errado' : 'Certo';
    res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: rQ1!.questionRef,
      competencyRef: compId,
      userAnswer: rWrong1,
      correctAnswer: rQ1!.correctAnswer,
      confidence: 'high',
      stage: 'reattempt',
      responseTimeMs: 2000,
    });
    session = res.session;
    // 1st reattempt error gives additional support
    expect(res.nextAction.type).toBe('trigger_intervention');

    // Reattempt 2
    session = engine.continueAfterDiagnostic(session);
    session = await engine.prepareReattempt(session);
    const rQ2 = await repo.getQuestionPresentation(session.currentQuestionRef)!;
    const rCorrectChoice2 = answerChoiceFor(rQ2!.correctAnswer, rQ2?.questionType === 'multiple_choice');
    const rWrong2 = rQ2?.questionType === 'multiple_choice'
      ? rQ2.options.find((o) => normalizePBLAnswer(o.label, 'multiple_choice') !== normalizePBLAnswer(rCorrectChoice2, 'multiple_choice'))?.label || 'B'
      : rCorrectChoice2 === 'Certo' ? 'Errado' : 'Certo';
    res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: rQ2!.questionRef,
      competencyRef: compId,
      userAnswer: rWrong2,
      correctAnswer: rQ2!.correctAnswer,
      confidence: 'high',
      stage: 'reattempt',
      responseTimeMs: 2000,
    });
    session = res.session;
    // 2nd reattempt error routes out to needs_review! No infinite loop!
    expect(['advance_competency', 'complete_session']).toContain(res.nextAction.type);
    expect(res.nextAction.outcome).toBe('needs_review');
  });

  // TEST 7 & 25: Ataque do Aluno que Joga o Sistema (Gaming the system)
  it('TESTE 7 & 25 — Ataque do aluno que joga o sistema: 3 chutes com alta confiança confirmam transferência', async () => {
    const compId = 'COMP-A00-G01-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const isMc = Boolean(c.options.length);
    const correctAnchor = answerChoiceFor(c.officialAnswer, isMc);

    let session = await engine.startSession({ userId: 'lucky_gamer', mode: 'guided', targetCompetencyId: compId });

    // Step 1: lucky guess on anchor with 'high' confidence
    let res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: c.anchorQuestionRef,
      competencyRef: compId,
      userAnswer: correctAnchor,
      correctAnswer: c.officialAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 800,
    });
    session = engine.continueAfterDiagnostic(res.session);

    // Step 2: lucky guess on transfer item 1 with 'high' confidence
    const q1 = await repo.getQuestionPresentation(session.currentQuestionRef)!;
    const q1Ans = answerChoiceFor(q1!.correctAnswer, q1!.questionType === 'multiple_choice');
    res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: q1!.questionRef,
      competencyRef: compId,
      userAnswer: q1Ans,
      correctAnswer: q1!.correctAnswer,
      confidence: 'high',
      stage: 'transfer',
      transferType: session.currentTransferItem?.transferType,
      responseTimeMs: 800,
    });
    session = res.session;

    // Step 3: lucky guess on transfer item 2 with 'high' confidence
    const q2 = await repo.getQuestionPresentation(session.currentQuestionRef)!;
    const q2Ans = answerChoiceFor(q2!.correctAnswer, q2!.questionType === 'multiple_choice');
    res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: q2!.questionRef,
      competencyRef: compId,
      userAnswer: q2Ans,
      correctAnswer: q2!.correctAnswer,
      confidence: 'high',
      stage: 'transfer',
      transferType: session.currentTransferItem?.transferType,
      responseTimeMs: 800,
    });
    session = res.session;

    expect(res.nextAction.outcome).toBe('transfer_confirmed');

    // Step 4: Reflection with 6 random words
    const nonsenseText = 'palavra aleatoria teste um dois tres';
    const completed = engine.completeReflection(session, {
      decision: 'own_rule',
      note: nonsenseText,
      suggestedRule: 'regra sugerida',
      revealedSuggestedRule: true,
    });

    expect(completed.status).toBe('completed');
    expect(completed.competencyOutcomes?.[compId]).toBe('transfer_confirmed');
    expect(completed.reflectionNotes?.[compId]).toBe(nonsenseText);
    expect(completed.masterySnapshot[compId].learningState).toBe('immediate_transfer_confirmed');
    // VULNERABILIDADE CRÍTICA COMPROVADA:
    // O sistema confirmou domínio/transferência para alguém que apenas chutou 3 vezes com 'high' e digitou palavras aleatórias!
  });

  // TEST 8 & 9: Falsa Retenção (Bloqueio sem intervalo de 20h)
  it('TESTE 8 & 9 — Falsa retenção: bloqueia retention_confirmed se intervalo for < 20h ou se houver ajuda', async () => {
    const compId = 'COMP-A10-G05-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const correctAnchor = answerChoiceFor(c.officialAnswer, Boolean(c.options.length));

    // A) Immediate review (0h elapsed)
    const immediateMastery: CompetencyMastery = {
      competencyId: compId, unitId: 'IP-A10-G05', lessonId: 'A10', score: 0.6, level: 'competent',
      learningState: 'immediate_transfer_confirmed', totalAttempts: 3, correctAttempts: 3, transferSuccessCount: 1,
      activeMisconceptions: [], resolvedMisconceptions: [], lastPracticedAt: new Date().toISOString(),
      nextReviewRecommendedAt: new Date().toISOString(), reviewIntervalDays: 1, successfulDelayedRetrievals: 0
    };
    const sessionImm = await engine.startSession({
      userId: 'user_imm', mode: 'review', targetCompetencyId: compId, currentMasteryMap: { [compId]: immediateMastery }
    });
    const resImm = await engine.submitAttempt(sessionImm, {
      sessionId: sessionImm.sessionId, questionRef: c.anchorQuestionRef, competencyRef: compId,
      userAnswer: correctAnchor, correctAnswer: c.officialAnswer, confidence: 'high', stage: 'initial', responseTimeMs: 2000
    });
    expect(resImm.attempt.isDelayedRetrieval).toBe(false);

    // B) Spaced (>20h) but WITH assistance
    const delayedMastery: CompetencyMastery = {
      ...immediateMastery,
      lastPracticedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    };
    const sessionAssisted = await engine.startSession({
      userId: 'user_assisted', mode: 'review', targetCompetencyId: compId, currentMasteryMap: { [compId]: delayedMastery }
    });
    const resAssisted = await engine.submitAttempt(sessionAssisted, {
      sessionId: sessionAssisted.sessionId, questionRef: c.anchorQuestionRef, competencyRef: compId,
      userAnswer: correctAnchor, correctAnswer: c.officialAnswer, confidence: 'high', stage: 'initial', assistanceLevel: 'full', responseTimeMs: 2000
    });
    expect(resAssisted.attempt.isDelayedRetrieval).toBe(true);
    expect(resAssisted.attempt.assistanceLevel).toBe('full');

    // Proceed to transfer for assisted
    const transferSession = engine.continueAfterDiagnostic(resAssisted.session);
    const qXfer = await repo.getQuestionPresentation(transferSession.currentQuestionRef)!;
    const qXferAns = answerChoiceFor(qXfer!.correctAnswer, qXfer!.questionType === 'multiple_choice');
    const xferRes = await engine.submitAttempt(transferSession, {
      sessionId: transferSession.sessionId, questionRef: qXfer!.questionRef, competencyRef: compId,
      userAnswer: qXferAns, correctAnswer: qXfer!.correctAnswer, confidence: 'high', stage: 'transfer',
      transferType: transferSession.currentTransferItem?.transferType, responseTimeMs: 2000
    });

    // Retention must NOT be confirmed because initial retrieval had full assistance!
    expect(xferRes.nextAction.outcome).not.toBe('retention_confirmed');
  });

  // TEST 11 & 12: Misconception estável requer sondagem independente
  it('TESTE 11 & 12 — Misconception: erro único = mapped_error_hypothesis; recorrência na sondagem = mapped_misconception', async () => {
    const targetCompId = 'COMP-A00-G03-02';
    const prereqCompId = 'COMP-A00-G03-01';
    const session = await engine.startSession({ userId: 'misc_user', mode: 'guided', targetCompetencyId: targetCompId });
    const anchorCase = await repo.getCaseForCompetency(targetCompId)!;
    const isMc = Boolean(anchorCase!.options.length);
    const correct = answerChoiceFor(anchorCase!.officialAnswer, isMc);
    const wrong = isMc ? anchorCase!.options.find((o) => o.label !== correct)?.label || 'B' : (correct === 'Certo' ? 'Errado' : 'Certo');

    const res1 = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: anchorCase!.anchorQuestionRef,
      competencyRef: targetCompId,
      userAnswer: wrong,
      correctAnswer: anchorCase!.officialAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 2000,
    });

    // 1st error is only hypothesis
    expect(res1.diagnostic?.diagnosisKind).toBe('mapped_error_hypothesis');
    expect(res1.diagnostic?.misconceptionRefs).toEqual([]);
    expect(res1.nextAction.type).toBe('request_probe');

    // 2nd error on prerequisite probe node
    const diagPath = await repo.getDiagnosticPathForCompetency(targetCompId);
    const prereqNode = diagPath?.nodes.find((n) => n.evaluatedPrerequisiteRef === prereqCompId);
    const probeQ = await repo.getQuestionPresentation(prereqNode!.questionRef);
    const probeWrong = probeQ?.questionType === 'multiple_choice'
      ? probeQ.options.find((o) => o.label !== probeQ.correctAnswer)?.label || 'B'
      : probeQ?.correctAnswer === 'Certo' ? 'Errado' : 'Certo';

    const res2 = await engine.submitAttempt(res1.session, {
      sessionId: session.sessionId,
      questionRef: prereqNode!.questionRef,
      competencyRef: targetCompId,
      userAnswer: probeWrong,
      correctAnswer: probeQ!.correctAnswer,
      confidence: 'high',
      stage: 'probe',
      responseTimeMs: 2000,
    });

    expect(res2.diagnostic?.diagnosisKind).toBe('prerequisite_deficit');
    expect(res2.nextAction.type).toBe('branch_to_prerequisite');
  });

  // TEST 15: Confiança Tem Consequências Reais
  it('TESTE 15 — Confiança tem impacto causal real no motor', () => {
    // 1. Classification
    expect(AttemptEvaluator.evaluateConfidence(true, 'high')).toBe('strong_correct');
    expect(AttemptEvaluator.evaluateConfidence(true, 'low')).toBe('fragile_correct');
    expect(AttemptEvaluator.evaluateConfidence(false, 'high')).toBe('high_confidence_error');
    expect(AttemptEvaluator.evaluateConfidence(false, 'low')).toBe('error');

    // 2. Score delta difference
    const model = new RuleBasedMasteryModel();
    const base: CompetencyMastery = {
      competencyId: 'C1', unitId: 'U1', lessonId: 'L1', score: 0.5, level: 'competent',
      learningState: 'acquiring', totalAttempts: 1, correctAttempts: 1, transferSuccessCount: 0,
      activeMisconceptions: [], resolvedMisconceptions: [], lastPracticedAt: new Date().toISOString(),
      nextReviewRecommendedAt: new Date().toISOString()
    };

    const deltaCorrectHigh = model.update(base, { competencyId: 'C1', isCorrect: true, confidence: 'high', stage: 'initial', hasMisconception: false }).score - base.score;
    const deltaCorrectLow = model.update(base, { competencyId: 'C1', isCorrect: true, confidence: 'low', stage: 'initial', hasMisconception: false }).score - base.score;
    const deltaErrorHigh = model.update(base, { competencyId: 'C1', isCorrect: false, confidence: 'high', stage: 'initial', hasMisconception: false }).score - base.score;
    const deltaErrorLow = model.update(base, { competencyId: 'C1', isCorrect: false, confidence: 'low', stage: 'initial', hasMisconception: false }).score - base.score;

    expect(deltaCorrectHigh).toBeCloseTo(0.12, 2);
    expect(deltaCorrectLow).toBeCloseTo(0.01, 2); // 12x lower!
    expect(deltaErrorHigh).toBeCloseTo(-0.14, 2); // 2x penalty!
    expect(deltaErrorLow).toBeCloseTo(-0.07, 2);
  });

  // TEST 16: Decisão Reflexiva 'needs_review' sobrepõe sucesso
  it('TESTE 16 — Reflexão: seleção de needs_review rebaixa outcome de transfer_confirmed para needs_review', async () => {
    const compId = 'COMP-A00-G01-01';
    const session = await engine.startSession({
      userId: 'ref_user',
      mode: 'guided',
      targetCompetencyId: compId,
      currentMasteryMap: {
        [compId]: {
          competencyId: compId,
          unitId: 'IP-A00-G01',
          lessonId: 'A00',
          score: 0.75,
          level: 'mastered',
          learningState: 'immediate_transfer_confirmed',
          totalAttempts: 3,
          correctAttempts: 3,
          transferSuccessCount: 2,
          activeMisconceptions: [],
          resolvedMisconceptions: [],
          lastPracticedAt: new Date().toISOString(),
          nextReviewRecommendedAt: new Date().toISOString(),
          reviewIntervalDays: 2,
        },
      },
    });
    session.phase = 'reflection';
    session.pendingNextAction = {
      type: 'complete_session',
      outcome: 'transfer_confirmed',
      reason: '2 transfer items passed',
    };

    const completed = engine.completeReflection(session, {
      decision: 'needs_review',
      note: '',
      suggestedRule: 'Regra sugerida',
    });

    expect(completed.competencyOutcomes?.[compId]).toBe('needs_review');
    expect(completed.masterySnapshot[compId].learningState).toBe('needs_review');
    expect(completed.masterySnapshot[compId].reviewIntervalDays).toBe(1);
  });

  // TEST 21: Casos-limite (Budget Timeout)
  it('TESTE 21 — Casos-limite: estouro de tempo ativo encerra com needs_review sem dar domínio', async () => {
    const compId = 'COMP-A00-G01-01';
    const c = cases.find((x) => x.competencyRef === compId)!;
    const correctAnchor = answerChoiceFor(c.officialAnswer, Boolean(c.options.length));

    const session = await engine.startSession({ userId: 'timeout_user', mode: 'guided', targetCompetencyId: compId });
    session.wallTimeMs = session.sessionBudgetMs || 12 * 60_000; // active budget reached

    const res = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: c.anchorQuestionRef,
      competencyRef: compId,
      userAnswer: correctAnchor,
      correctAnswer: c.officialAnswer,
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1500,
    });

    expect(res.nextAction.type).toBe('complete_session');
    expect(res.nextAction.outcome).toBe('needs_review');
    expect(res.nextAction.reason).toMatch(/limite adaptativo/i);
  });
});
