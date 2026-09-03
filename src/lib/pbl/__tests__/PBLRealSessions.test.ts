import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import { AttemptEvaluator } from '../engine/AttemptEvaluator';
import { DiagnosticResolver } from '../engine/DiagnosticResolver';
import { TransferSelector } from '../engine/TransferSelector';
import { QuestionPoolSelector } from '../engine/QuestionPoolSelector';
import { RuleBasedMasteryModel, BKTMasteryModel } from '../engine/MasteryUpdater';
import type { CompetencyMastery } from '../../../types/pbl';
import type {
  PBLCompetency,
  PBLCase,
  PBLTransferSet,
  PBLDiagnosticPath,
  PBLCumulativeSession,
  QuestionPedagogy,
  QuestionCompetencyLink,
  PBLRuntimeShardManifest,
} from '../../../types/pbl';
import { answerChoiceFor, normalizePBLAnswer } from '../answerAdapter';
import { loadPublishedQuestionPresentations } from './publishedQuestionTestData';

describe('PBLEngine Real Datasets Comprehensive Homologation', () => {
  let repo: PBLRepository;
  let engine: PBLEngine;
  let realCases: PBLCase[];
  let realTransferSets: PBLTransferSet[];
  let publishedPresentations: ReturnType<typeof loadPublishedQuestionPresentations>;

  const loadRuntimeDataset = <T,>(
    pblDir: string,
    dataset: PBLRuntimeShardManifest['datasets']['questionCompetencyLinks'],
  ): Record<string, T> => {
    const combined: Record<string, T> = {};
    for (const shard of dataset.shards) {
      Object.assign(
        combined,
        JSON.parse(fs.readFileSync(path.join(pblDir, shard.file), 'utf8')) as Record<string, T>,
      );
    }
    expect(Object.keys(combined)).toHaveLength(dataset.totalRecords);
    return combined;
  };

  beforeAll(() => {
    const pblDir = path.resolve('public/knowledge/pbl');
    const comps: PBLCompetency[] = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_competency_map.json'), 'utf8')
    );
    const cases: PBLCase[] = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_cases.json'), 'utf8')
    );
    const xfers: PBLTransferSet[] = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_transfer_sets.json'), 'utf8')
    );
    const diags: PBLDiagnosticPath[] = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_diagnostic_paths.json'), 'utf8')
    );
    const sessions: PBLCumulativeSession[] = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_cumulative_review_sessions.json'), 'utf8')
    );
    const runtimeManifest: PBLRuntimeShardManifest = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'pbl_runtime_manifest.json'), 'utf8')
    );
    const qcl = loadRuntimeDataset<QuestionCompetencyLink>(
      pblDir,
      runtimeManifest.datasets.questionCompetencyLinks,
    );
    const qp = loadRuntimeDataset<QuestionPedagogy>(
      pblDir,
      runtimeManifest.datasets.questionPedagogy,
    );
    const questionPresentations = loadPublishedQuestionPresentations();
    realCases = cases;
    realTransferSets = xfers;
    publishedPresentations = questionPresentations;

    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: comps,
      cases,
      transferSets: xfers,
      diagnosticPaths: diags,
      cumulativeSessions: sessions,
      questionLinksMap: qcl,
      questionPedagogyMap: qp,
      questionPresentations,
    });

    engine = new PBLEngine(repo);
  }, 60_000);

  const targetLessons = ['A00', 'A02', 'A06', 'A08', 'A09', 'A10', 'A11', 'A13'];
  for (const lessonId of targetLessons) {
    it(`should run complete problem->diagnostic->transfer flow for lesson ${lessonId}`, async () => {
      const session = await engine.startSession({
        userId: 'homolog_user',
        mode: 'guided',
        targetLessonId: lessonId,
        maxCompetencies: 2,
      });

      expect(session.sessionId).toBeDefined();
      expect(session.targetCompetencyRefs.length).toBeGreaterThan(0);
      expect(session.currentCompetencyRef).toContain(lessonId);

      const comp = await repo.getCompetency(session.currentCompetencyRef);
      expect(comp).toBeDefined();
      expect(comp?.lessonId).toBe(lessonId);

      const anchorCase = await repo.getCaseForCompetency(session.currentCompetencyRef);
      expect(anchorCase).toBeDefined();

      const anchorIsMultipleChoice = Boolean(anchorCase!.options.length);
      const correctAnchorAnswer = answerChoiceFor(anchorCase!.officialAnswer, anchorIsMultipleChoice);
      const wrongAnswer = anchorIsMultipleChoice
        ? anchorCase!.options.find((option) => normalizePBLAnswer(option.label, 'multiple_choice') !== normalizePBLAnswer(anchorCase!.officialAnswer, 'multiple_choice'))?.label || '__WRONG__'
        : correctAnchorAnswer === 'Certo' ? 'Errado' : 'Certo';
      const step1 = await engine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: anchorCase!.anchorQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: wrongAnswer,
        correctAnswer: anchorCase!.officialAnswer,
        answerMode: anchorIsMultipleChoice ? 'multiple_choice' : 'true_false',
        confidence: 'high',
        stage: 'initial',
        reasoning: 'Apliquei a regra equivocada de semelhança formal.',
        responseTimeMs: 14000,
      });

      expect(step1.attempt.isCorrect).toBe(false);
      expect(step1.attempt.evaluation).toBe('high_confidence_error');
      expect(step1.diagnostic).toBeDefined();
      if (step1.nextAction.type === 'trigger_intervention') {
        expect(step1.intervention).toBeDefined();
      }
      expect(['trigger_intervention', 'request_probe']).toContain(step1.nextAction.type);
      expect(step1.session.phase).toBe('diagnostic');

      const reattemptSession = await engine.prepareReattempt(step1.session);
      const reattemptQuestion = await repo.getQuestionPresentation(reattemptSession.currentQuestionRef);
      expect(reattemptQuestion).toBeDefined();
      expect(reattemptQuestion?.prompt.length).toBeGreaterThan(10);
      const step2 = await engine.submitAttempt(reattemptSession, {
        sessionId: session.sessionId,
        questionRef: reattemptQuestion!.questionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: answerChoiceFor(reattemptQuestion!.correctAnswer, reattemptQuestion!.questionType === 'multiple_choice'),
        correctAnswer: reattemptQuestion!.correctAnswer,
        answerMode: reattemptQuestion!.questionType,
        confidence: 'high',
        stage: 'reattempt',
        reasoning: 'Apliquei o procedimento determinístico após a microaula.',
        responseTimeMs: 9000,
      });

      expect(step2.attempt.isCorrect).toBe(true);
      expect(['request_transfer', 'advance_competency', 'complete_session']).toContain(step2.nextAction.type);
      if (step2.nextAction.type === 'request_transfer') {
        const transferSession = engine.continueAfterDiagnostic(step2.session);
        const transferQuestion = await repo.getQuestionPresentation(transferSession.currentQuestionRef);
        expect(transferQuestion).toBeDefined();
        const step3 = await engine.submitAttempt(transferSession, {
          sessionId: session.sessionId,
          questionRef: transferQuestion!.questionRef,
          competencyRef: session.currentCompetencyRef,
          userAnswer: answerChoiceFor(transferQuestion!.correctAnswer, transferQuestion!.questionType === 'multiple_choice'),
          correctAnswer: transferQuestion!.correctAnswer,
          answerMode: transferQuestion!.questionType,
          confidence: 'high',
          stage: 'transfer',
          transferType: transferSession.currentTransferItem?.transferType,
          responseTimeMs: 11000,
        });
        expect(step3.attempt.isCorrect).toBe(true);
        expect(step3.session.masterySnapshot[session.currentCompetencyRef].score).toBeGreaterThan(0.1);
      }
    });
  }

  it('branches from a proven prerequisite deficit and then keeps the original competency queued', async () => {
    const targetCompetencyId = 'COMP-A00-G03-02';
    const prerequisiteCompetencyId = 'COMP-A00-G03-01';
    const session = await engine.startSession({
      userId: 'prerequisite_user',
      mode: 'guided',
      targetCompetencyId,
      maxCompetencies: 1,
    });
    const anchorCase = await repo.getCaseForCompetency(targetCompetencyId);
    expect(anchorCase).toBeDefined();
    const multipleChoice = Boolean(anchorCase!.options.length);
    const correctAnswer = answerChoiceFor(anchorCase!.officialAnswer, multipleChoice);
    const wrongAnswer = multipleChoice
      ? anchorCase!.options.find((option) =>
          normalizePBLAnswer(option.label, 'multiple_choice')
          !== normalizePBLAnswer(anchorCase!.officialAnswer, 'multiple_choice')
        )?.label || '__WRONG__'
      : correctAnswer === 'Certo' ? 'Errado' : 'Certo';

    const initialResult = await engine.submitAttempt(session, {
      sessionId: session.sessionId,
      questionRef: anchorCase!.anchorQuestionRef,
      competencyRef: targetCompetencyId,
      userAnswer: wrongAnswer,
      correctAnswer: anchorCase!.officialAnswer,
      answerMode: multipleChoice ? 'multiple_choice' : 'true_false',
      confidence: 'high',
      stage: 'initial',
      responseTimeMs: 1_000,
    });

    const diagPath = await repo.getDiagnosticPathForCompetency(targetCompetencyId);
    const prereqNode = diagPath?.nodes.find((n) => n.evaluatedPrerequisiteRef === prerequisiteCompetencyId);
    expect(prereqNode).toBeDefined();
    const probeQuestion = await repo.getQuestionPresentation(prereqNode!.questionRef);
    const probeWrong = probeQuestion?.questionType === 'multiple_choice'
      ? probeQuestion.options.find((o) => o.label !== probeQuestion.correctAnswer)?.label || 'B'
      : probeQuestion?.correctAnswer === 'Certo' ? 'Errado' : 'Certo';
    const result = await engine.submitAttempt(initialResult.session, {
      sessionId: session.sessionId,
      questionRef: prereqNode!.questionRef,
      competencyRef: targetCompetencyId,
      userAnswer: probeWrong,
      correctAnswer: probeQuestion?.correctAnswer || 'Certo',
      answerMode: probeQuestion?.questionType || 'true_false',
      confidence: 'high',
      stage: 'probe',
      responseTimeMs: 1_000,
    });

    expect(result.diagnostic).toMatchObject({
      diagnosisKind: 'prerequisite_deficit',
      prerequisiteCompetencyRef: prerequisiteCompetencyId,
    });
    expect(result.nextAction).toMatchObject({
      type: 'branch_to_prerequisite',
      targetCompetencyRef: prerequisiteCompetencyId,
    });
    const branched = engine.continueAfterDiagnostic(result.session);
    expect(branched.currentCompetencyRef).toBe(prerequisiteCompetencyId);
    expect(branched.targetCompetencyRefs).toEqual([
      prerequisiteCompetencyId,
      targetCompetencyId,
    ]);
  });

  it('should make all 190 rebuilt anchors answerable', async () => {
    const ungraded = realCases.filter((pblCase) => !pblCase.officialAnswer);
    expect(ungraded).toEqual([]);

    const evaluator = new AttemptEvaluator();
    for (const pblCase of realCases.filter((candidate) => Boolean(candidate.officialAnswer))) {
      const multipleChoice = Boolean(pblCase.options.length);
      const answer = answerChoiceFor(pblCase.officialAnswer, multipleChoice);
      if (multipleChoice) {
        expect(pblCase.options.map((option) => normalizePBLAnswer(option.label, 'multiple_choice'))).toContain(answer);
      } else {
        expect(['Certo', 'Errado']).toContain(answer);
      }
      expect(evaluator.evaluate({
        sessionId: 'compatibility', questionRef: pblCase.anchorQuestionRef,
        competencyRef: pblCase.competencyRef, userAnswer: answer,
        correctAnswer: pblCase.officialAnswer,
        answerMode: multipleChoice ? 'multiple_choice' : 'true_false',
        confidence: 'medium', stage: 'initial', responseTimeMs: 1,
      }).isCorrect).toBe(true);
    }

    const rebuiltSession = await engine.startSession({
      userId: 'test', mode: 'guided', targetCompetencyId: 'COMP-A04-G02-01',
    });
    expect(rebuiltSession.currentQuestionRef).toBeTruthy();
  });

  it('should have at least one real published transfer question for all 190 competencies', () => {
    for (const transferSet of realTransferSets) {
      expect(
        transferSet.items.some((item) => Boolean(publishedPresentations[item.officialQuestionRef])),
        transferSet.competencyRef
      ).toBe(true);
    }
  });

  it('should consume online candidates in all four runtime PBL roles', async () => {
    const competencies = await repo.getAllCompetencies();
    const gradedCompetencies = new Set(
      realCases.filter((pblCase) => Boolean(pblCase.officialAnswer)).map((pblCase) => pblCase.competencyRef)
    );
    const findOnlineCompetency = (
      field: 'anchorCandidateRefs' | 'diagnosticCandidateRefs' | 'transferCandidateRefs' | 'validationCandidateRefs'
    ) => competencies.find((competency) =>
      gradedCompetencies.has(competency.competencyId)
      && competency[field].some((questionRef) => questionRef.includes('-estrategia.'))
    );

    const anchorCompetency = findOnlineCompetency('anchorCandidateRefs');
    expect(anchorCompetency).toBeDefined();
    const anchorSession = await engine.startSession({
      userId: 'online_anchor_user',
      mode: 'guided',
      targetCompetencyId: anchorCompetency!.competencyId,
    });
    expect(anchorSession.currentQuestionRef).toContain('-estrategia.');
    expect(await repo.getQuestionPresentation(anchorSession.currentQuestionRef)).toBeDefined();

    const diagnosticCompetency = findOnlineCompetency('diagnosticCandidateRefs');
    expect(diagnosticCompetency).toBeDefined();
    const diagnosticCandidate = await new QuestionPoolSelector(repo).selectQuestion(
      diagnosticCompetency!.competencyId,
      'diagnostic',
      { onlineOnly: true, seed: 'online-role-proof' }
    );
    expect(diagnosticCandidate?.questionRef).toContain('-estrategia.');

    const transferCompetency = findOnlineCompetency('transferCandidateRefs');
    expect(transferCompetency).toBeDefined();
    const transfer = await new TransferSelector(repo).selectNextTransferItem(
      transferCompetency!.competencyId,
      'strong_correct',
      0,
      undefined,
      [],
      true
    );
    expect(transfer?.officialQuestionRef).toContain('-estrategia.');

    const validationCompetency = findOnlineCompetency('validationCandidateRefs');
    expect(validationCompetency).toBeDefined();
    const validationSession = await engine.startSession({
      userId: 'online_validation_user',
      mode: 'guided',
      targetCompetencyId: validationCompetency!.competencyId,
    });
    validationSession.attempts.push({
      attemptId: 'att_before_validation',
      sessionId: validationSession.sessionId,
      questionRef: validationSession.currentQuestionRef,
      competencyRef: validationCompetency!.competencyId,
      stage: 'initial',
      userAnswer: '__WRONG__',
      correctAnswer: '__CORRECT__',
      isCorrect: false,
      confidence: 'high',
      evaluation: 'high_confidence_error',
      responseTimeMs: 1000,
      detectedTrapRefs: [],
      detectedMisconceptionRefs: [],
      interventionRefs: [],
      createdAt: new Date().toISOString(),
    });
    const validationSessionPrepared = await engine.prepareReattempt(validationSession);
    expect(validationSessionPrepared.currentQuestionRef).toContain('-estrategia.');

    const poolSelector = new QuestionPoolSelector(repo);
    expect(await poolSelector.selectQuestion(
      validationCompetency!.competencyId,
      'validation',
      { onlineOnly: true, seed: 'audit' }
    )).toBeDefined();
  });

  it('should block the hybrid q0020 from Fonética e Fonologia and expose audited coverage', async () => {
    const selector = new QuestionPoolSelector(repo);
    expect(await selector.isQuestionEligibleForCompetency(
      'COMP-A00-G01-01',
      'OQ-A00-aula00.q0020'
    )).toBe(false);

    const phonetics = await repo.getCompetency('COMP-A00-G01-01');
    expect(phonetics?.practiceCoverage?.status).toBe('ready');
    expect(phonetics?.practiceCoverage?.eligibleQuestions).toBe(7);
    expect(phonetics?.transferCandidateRefs).toEqual([
      'OQ-A00-aula00.q0001',
      'OQ-A00-aula00.q0002',
      'OQ-A00-aula00.q0065',
      'OQ-A00-aula00.q0066',
      'OQ-A00-aula00.q0067',
    ]);
  });

  it('should expose readiness without promoting unverified transfer evidence', async () => {
    const selector = new QuestionPoolSelector(repo);
    const competencies = await repo.getAllCompetencies();
    expect(competencies).toHaveLength(190);
    const g03Ids = ['COMP-A04-G03-01', 'COMP-A04-G03-02', 'COMP-A04-G03-03'];
    const g08Ids = [
      'COMP-A04-G08-01',
      'COMP-A04-G08-02',
      'COMP-A04-G08-03',
    ];
    const transferLimitedIds = new Set([
      'COMP-A05-G03-01',
      'COMP-A05-G03-02',
      'COMP-A05-G03-03',
      'COMP-A07-G05-01',
      'COMP-A07-G05-02',
      'COMP-A07-G05-03',
      'COMP-A07-G06-01',
      'COMP-A07-G06-02',
    ]);

    for (const competency of competencies) {
      const readiness = await selector.evaluatePracticeReadiness(
        competency.competencyId,
        `full-audit:${competency.competencyId}`
      );
      if (transferLimitedIds.has(competency.competencyId)) {
        expect(competency.practiceCoverage?.status, competency.competencyId).toBe('limited');
        expect(readiness.ready, competency.competencyId).toBe(false);
        expect(readiness.transferQuestionRefs).toHaveLength(0);
        expect(competency.practiceCoverage?.auditedTransferCandidates).toBe(1);
      } else {
        expect(competency.practiceCoverage?.status, competency.competencyId).toBe('ready');
        expect(readiness.ready, `${competency.competencyId}: ${readiness.reason || ''}`).toBe(true);
        expect(readiness.transferQuestionRefs).toHaveLength(2);
      }
    }

    expect(competencies.filter((item) => item.practiceCoverage?.status === 'ready')).toHaveLength(182);
    expect(competencies.filter((item) => item.practiceCoverage?.status === 'limited')).toHaveLength(8);
    for (const competencyId of g03Ids) {
      const competency = competencies.find((item) => item.competencyId === competencyId)!;
      expect(competency.practiceCoverage?.distinctQuestions).toBe(43);
      expect(competency.eligibleQuestionRefs.filter((ref) => ref.startsWith('PBLQ-A04-G03-'))).toHaveLength(40);
    }
    for (const competencyId of g08Ids) {
      const competency = competencies.find((item) => item.competencyId === competencyId)!;
      expect(competency.practiceCoverage?.distinctQuestions).toBe(43);
      expect(competency.eligibleQuestionRefs.filter((ref) => ref.startsWith('PBLQ-A04-G08-'))).toHaveLength(41);
    }
    const remediatedSession = await engine.startSession({
      userId: 'remediated_gap_user',
      mode: 'guided',
      targetCompetencyId: 'COMP-A04-G03-01',
    });
    expect(remediatedSession.currentQuestionRef).toMatch(/^PBLQ-A04-G03-/);
  }, 60_000);

  it('should consume the reviewed editorial link for verbs in -ear', async () => {
    const selector = new QuestionPoolSelector(repo);
    expect(await selector.isQuestionEligibleForCompetency(
      'COMP-A04-G08-01',
      'OQ-A04-aula04.q0101'
    )).toBe(true);
  });

  it('should run a cumulative spiral review session for A14 (A14-S01)', async () => {
    const session = await engine.startSession({
      userId: 'homolog_user',
      mode: 'cumulative',
      cumulativeSessionId: 'PBL-SESS-A14-S01',
      maxCompetencies: 2,
    });

    expect(session.sessionId).toBeDefined();
    expect(session.targetCompetencyRefs.length).toBeGreaterThan(0);
    expect(session.mode).toBe('cumulative');

    const cumSess = await repo.getCumulativeSession('PBL-SESS-A14-S01');
    expect(cumSess).toBeDefined();
    expect(cumSess?.unitId).toBe('IP-A14-S01');
    expect(cumSess?.spiralProgressionLevel).toBe(1);
  });

  it('should rotate cumulative coverage and mix older with recent competencies across all A14 sessions', async () => {
    const cumulativeSessions = await repo.getCumulativeSessions();
    const selectedPairs: string[] = [];

    expect(cumulativeSessions).toHaveLength(13);
    for (const cumulativeSession of cumulativeSessions) {
      const session = await engine.startSession({
        userId: 'spiral_rotation_user',
        mode: 'cumulative',
        cumulativeSessionId: cumulativeSession.sessionId,
        maxCompetencies: 2,
      });

      expect(session.targetCompetencyRefs).toHaveLength(2);
      expect(session.targetCompetencyRefs.every((id) =>
        cumulativeSession.integratedCompetencyRefs.includes(id)
      )).toBe(true);
      selectedPairs.push([...session.targetCompetencyRefs].sort().join('|'));

      const repeatedSession = await engine.startSession({
        userId: 'spiral_rotation_user',
        mode: 'cumulative',
        cumulativeSessionId: cumulativeSession.sessionId,
        maxCompetencies: 2,
      });
      expect(repeatedSession.targetCompetencyRefs).toEqual(session.targetCompetencyRefs);

      const selectedCompetencies = await Promise.all(
        session.targetCompetencyRefs.map((id) => repo.getCompetency(id))
      );
      const latestLesson = cumulativeSession.coveredCurricularLessons.at(-1);
      if (cumulativeSession.coveredCurricularLessons.length > 1 && latestLesson) {
        expect(selectedCompetencies.some((competency) => competency?.lessonId === latestLesson)).toBe(true);
        expect(selectedCompetencies.some((competency) => competency?.lessonId !== latestLesson)).toBe(true);

        const crossLessonFocus = new Set(
          (await Promise.all(
            cumulativeSession.crossLessonTransferSetRefs.map((id) => repo.getTransferSet(id))
          ))
            .map((transferSet) => transferSet?.competencyRef)
            .filter((id): id is string => Boolean(id))
        );
        expect(session.targetCompetencyRefs.some((id) => crossLessonFocus.has(id))).toBe(true);
      }
    }

    expect(new Set(selectedPairs).size).toBe(cumulativeSessions.length);
  }, 60_000);

  it('should prioritize overdue competencies inside the old and recent cumulative slots', async () => {
    const cumulativeSession = await repo.getCumulativeSession('PBL-SESS-A14-S04');
    expect(cumulativeSession).toBeDefined();
    const latestLesson = cumulativeSession!.coveredCurricularLessons.at(-1)!;
    const recentTarget = (await Promise.all(
      cumulativeSession!.integratedCompetencyRefs.map((id) => repo.getCompetency(id))
    )).find((competency) => competency?.lessonId === latestLesson)!;
    const oldTarget = await repo.getCompetency('COMP-A00-G03-02');
    expect(oldTarget).toBeDefined();

    const futureReview = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const overdueReview = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const masteryMap: Record<string, CompetencyMastery> = {};
    for (const competencyId of cumulativeSession!.integratedCompetencyRefs) {
      const competency = await repo.getCompetency(competencyId);
      if (!competency) continue;
      masteryMap[competencyId] = {
        competencyId,
        unitId: competency.unitId,
        lessonId: competency.lessonId,
        score: 0.82,
        level: 'mastered',
        totalAttempts: 6,
        correctAttempts: 5,
        transferSuccessCount: 2,
        activeMisconceptions: [],
        resolvedMisconceptions: [],
        lastPracticedAt: new Date().toISOString(),
        nextReviewRecommendedAt: futureReview,
      };
    }
    masteryMap[oldTarget!.competencyId] = {
      ...masteryMap[oldTarget!.competencyId],
      score: 0.35,
      level: 'developing',
      activeMisconceptions: ['MIS-OVERDUE-OLD'],
      nextReviewRecommendedAt: overdueReview,
    };
    masteryMap[recentTarget.competencyId] = {
      ...masteryMap[recentTarget.competencyId],
      score: 0.42,
      level: 'developing',
      activeMisconceptions: ['MIS-OVERDUE-RECENT'],
      nextReviewRecommendedAt: overdueReview,
    };

    const session = await engine.startSession({
      userId: 'overdue_review_user',
      mode: 'cumulative',
      cumulativeSessionId: cumulativeSession!.sessionId,
      currentMasteryMap: masteryMap,
      maxCompetencies: 2,
    });

    expect(new Set(session.targetCompetencyRefs)).toEqual(new Set([
      oldTarget!.competencyId,
      recentTarget.competencyId,
    ]));
  }, 60_000);

  describe('AttemptEvaluator 4-Quadrant Policies', () => {
    it('should classify strong_correct (Correct + High/Medium Confidence)', () => {
      expect(AttemptEvaluator.evaluateConfidence(true, 'high')).toBe('strong_correct');
      expect(AttemptEvaluator.evaluateConfidence(true, 'medium')).toBe('strong_correct');
    });

    it('should classify fragile_correct (Correct + Low/Guess Confidence)', () => {
      expect(AttemptEvaluator.evaluateConfidence(true, 'low')).toBe('fragile_correct');
      expect(AttemptEvaluator.evaluateConfidence(true, 'guess')).toBe('fragile_correct');
    });

    it('should classify high_confidence_error (Wrong + High Confidence)', () => {
      expect(AttemptEvaluator.evaluateConfidence(false, 'high')).toBe('high_confidence_error');
    });

    it('should classify error (Wrong + Low/Guess Confidence)', () => {
      expect(AttemptEvaluator.evaluateConfidence(false, 'low')).toBe('error');
      expect(AttemptEvaluator.evaluateConfidence(false, 'guess')).toBe('error');
    });
  });

  describe('DiagnosticResolver Confidence Thresholds', () => {
    it('should not infer a misconception from confidence alone', async () => {
      const resolver = new DiagnosticResolver(repo);
      const attempt = {
        attemptId: 'att_test',
        sessionId: 'sess_test',
        questionRef: 'OQ-A10-aula10.q0001',
        competencyRef: 'COMP-A10-G01-01',
        stage: 'initial' as const,
        userAnswer: 'Errado',
        correctAnswer: 'Certo',
        isCorrect: false,
        confidence: 'high' as const,
        evaluation: 'high_confidence_error' as const,
        responseTimeMs: 10000,
        detectedTrapRefs: [],
        detectedMisconceptionRefs: [],
        interventionRefs: [],
        createdAt: new Date().toISOString(),
      };

      const result = await resolver.resolveDiagnostic(attempt);
      expect(result.diagnosisKind).toBe('unknown');
      expect(result.diagnosticConfidence).toBeLessThanOrEqual(0.55);
      expect(result.needsProbe).toBe(true);
      expect(result.misconceptionRefs).toEqual([]);
    });
  });

  describe('TransferSelector Tiers', () => {
    it('should select isomorphic/near transfer after error', async () => {
      const selector = new TransferSelector(repo);
      const item = await selector.selectNextTransferItem('COMP-A00-G03-01', 'error', 0);
      expect(item).toBeDefined();
      expect(['isomorphic', 'near_transfer']).toContain(item?.transferType);
      expect(item?.validationStatus).toBe('audited');
      expect(item?.changedDimensions.length).toBeGreaterThan(0);
    });

    it('should select near or boundary transfer after strong correct', async () => {
      const selector = new TransferSelector(repo);
      const item = await selector.selectNextTransferItem('COMP-A00-G03-01', 'strong_correct', 0);
      expect(item).toBeDefined();
      expect(['isomorphic', 'near_transfer', 'boundary_case']).toContain(item?.transferType);
      expect(item?.validationStatus).toBe('audited');
    });
  });

  describe('Mastery Models Bound Verification', () => {
    it('RuleBasedMasteryModel must never exceed 1.0 or go below 0.0', () => {
      const model = new RuleBasedMasteryModel();
      let mastery: CompetencyMastery = {
        competencyId: 'COMP-01',
        unitId: 'IP-01',
        lessonId: 'A00',
        score: 0.95,
        level: 'expert' as const,
        totalAttempts: 10,
        correctAttempts: 10,
        transferSuccessCount: 5,
        activeMisconceptions: [],
        resolvedMisconceptions: [],
        lastPracticedAt: new Date().toISOString(),
        nextReviewRecommendedAt: new Date().toISOString(),
      };

      for (let i = 0; i < 5; i++) {
        mastery = model.update(mastery, {
          competencyId: 'COMP-01',
          isCorrect: true,
          confidence: 'high',
          stage: 'transfer',
          transferType: 'far_transfer',
          hasMisconception: false,
        });
        expect(mastery.score).toBeLessThanOrEqual(1.0);
      }

      for (let i = 0; i < 10; i++) {
        mastery = model.update(mastery, {
          competencyId: 'COMP-01',
          isCorrect: false,
          confidence: 'high',
          stage: 'initial',
          hasMisconception: true,
        });
        expect(mastery.score).toBeGreaterThanOrEqual(0.0);
      }
    });

    it('BKTMasteryModel must remain mathematically bounded in [0.0, 1.0]', () => {
      const model = new BKTMasteryModel();
      let mastery: CompetencyMastery = {
        competencyId: 'COMP-01',
        unitId: 'IP-01',
        lessonId: 'A00',
        score: 0.50,
        level: 'competent' as const,
        totalAttempts: 5,
        correctAttempts: 3,
        transferSuccessCount: 1,
        activeMisconceptions: [],
        resolvedMisconceptions: [],
        lastPracticedAt: new Date().toISOString(),
        nextReviewRecommendedAt: new Date().toISOString(),
      };

      for (let i = 0; i < 8; i++) {
        mastery = model.update(mastery, {
          competencyId: 'COMP-01',
          isCorrect: true,
          confidence: 'high',
          stage: 'transfer',
          hasMisconception: false,
        });
        expect(mastery.score).toBeLessThanOrEqual(1.0);
        expect(mastery.score).toBeGreaterThanOrEqual(0.0);
      }
    });
  });
});
