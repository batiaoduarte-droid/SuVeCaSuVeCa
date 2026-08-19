import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PBLEngine } from '../engine/PBLEngine';
import { PBLRepository } from '../data/PBLRepository';
import { AttemptEvaluator } from '../engine/AttemptEvaluator';
import { DiagnosticResolver } from '../engine/DiagnosticResolver';
import { TransferSelector } from '../engine/TransferSelector';
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
} from '../../../types/pbl';

describe('PBLEngine Real Datasets Comprehensive Homologation', () => {
  let repo: PBLRepository;
  let engine: PBLEngine;

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
    const qcl: Record<string, QuestionCompetencyLink> = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'question_competency_links.json'), 'utf8')
    );
    const qp: Record<string, QuestionPedagogy> = JSON.parse(
      fs.readFileSync(path.join(pblDir, 'question_pedagogy_index.json'), 'utf8')
    );

    repo = new PBLRepository();
    repo.loadDirectly({
      competencies: comps,
      cases,
      transferSets: xfers,
      diagnosticPaths: diags,
      cumulativeSessions: sessions,
      questionLinksMap: qcl,
      questionPedagogyMap: qp,
    });

    engine = new PBLEngine(repo);
  });

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

      const wrongAnswer = anchorCase?.officialAnswer === 'Certo' ? 'Errado' : 'Certo';
      const step1 = await engine.submitAttempt(session, {
        sessionId: session.sessionId,
        questionRef: anchorCase!.anchorQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: wrongAnswer,
        correctAnswer: anchorCase!.officialAnswer,
        confidence: 'high',
        stage: 'initial',
        reasoning: 'Apliquei a regra equivocada de semelhança formal.',
        responseTimeMs: 14000,
      });

      expect(step1.attempt.isCorrect).toBe(false);
      expect(step1.attempt.evaluation).toBe('high_confidence_error');
      expect(step1.diagnostic).toBeDefined();
      expect(step1.intervention).toBeDefined();
      expect(step1.nextAction.type).toBe('trigger_intervention');
      expect(step1.session.phase).toBe('diagnostic');

      const step2 = await engine.submitAttempt(step1.session, {
        sessionId: session.sessionId,
        questionRef: anchorCase!.anchorQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: anchorCase!.officialAnswer,
        correctAnswer: anchorCase!.officialAnswer,
        confidence: 'high',
        stage: 'reattempt',
        reasoning: 'Apliquei o procedimento determinístico após a microaula.',
        responseTimeMs: 9000,
      });

      expect(step2.attempt.isCorrect).toBe(true);
      expect(step2.nextAction.type).toBe('request_transfer');
      expect(step2.session.phase).toBe('transfer');

      const step3 = await engine.submitAttempt(step2.session, {
        sessionId: session.sessionId,
        questionRef: step2.session.currentQuestionRef,
        competencyRef: session.currentCompetencyRef,
        userAnswer: 'Certo',
        correctAnswer: 'Certo',
        confidence: 'high',
        stage: 'transfer',
        transferType: 'near_transfer',
        responseTimeMs: 11000,
      });

      expect(step3.attempt.isCorrect).toBe(true);
      expect(step3.session.masterySnapshot[session.currentCompetencyRef].score).toBeGreaterThan(0.1);
    });
  }

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
    it('should output high diagnostic confidence (>= 0.85) on high_confidence_error', async () => {
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
      expect(result.diagnosticConfidence).toBeGreaterThanOrEqual(0.85);
      expect(result.needsProbe).toBe(false);
      expect(result.misconceptionRefs.length).toBeGreaterThan(0);
    });
  });

  describe('TransferSelector Tiers', () => {
    it('should select isomorphic/near transfer after error', async () => {
      const selector = new TransferSelector(repo);
      const item = await selector.selectNextTransferItem('COMP-A10-G01-01', 'error', 0);
      expect(item).toBeDefined();
      expect(['isomorphic', 'near_transfer']).toContain(item?.transferType);
    });

    it('should select near or boundary transfer after strong correct', async () => {
      const selector = new TransferSelector(repo);
      const item = await selector.selectNextTransferItem('COMP-A10-G01-01', 'strong_correct', 0);
      expect(item).toBeDefined();
      expect(['isomorphic', 'near_transfer', 'boundary_case']).toContain(item?.transferType);
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
