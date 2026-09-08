import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  handlePBLTutorTurn,
  handlePBLTutorManifest,
  handlePBLTutorContext,
  handlePBLSessionSync,
} from '../pblTutorServerRoute';
import { PBLSessionRepository } from '../../persistence/PBLSessionRepository';
import { pblServerSessionRepository } from '../../server/PBLServerSessionRepository';
import type { PBLSession } from '../../../../types/pbl';

function createMockReqRes(
  body: any = {},
  params: any = {},
  query: any = {},
  headers: any = {},
  locals: any = {}
) {
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = String(v);
  }
  const req = {
    body,
    params,
    query,
    headers: normalizedHeaders,
    header: (name: string) => normalizedHeaders[name.toLowerCase()],
  } as unknown as Request;

  let statusCode = 200;
  let jsonBody: any = null;

  const res = {
    locals,
    status: vi.fn().mockImplementation((code: number) => {
      statusCode = code;
      return res;
    }),
    json: vi.fn().mockImplementation((data: any) => {
      jsonBody = data;
      return res;
    }),
  } as unknown as Response;

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getBody: () => jsonBody,
  };
}

describe('PBLTutorServerRoute Handlers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    PBLSessionRepository.registerSyncHook(async (s) => {
      const effectiveUser = s.userId && s.userId !== 'guest' ? s.userId : 'user_test_student_123';
      await pblServerSessionRepository.saveSession(s, effectiveUser);
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    PBLSessionRepository.registerSyncHook(null);
  });

  describe('handlePBLTutorTurn', () => {
    it('returns 400 when questionRef is missing', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({
        userMessage: 'Olá',
      });

      await handlePBLTutorTurn(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('questionRef é obrigatório');
    });

    it('returns 404 when questionRef does not exist', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({
        questionRef: 'NON-EXISTENT-QUESTION-REF',
        userMessage: 'Olá',
      });

      await handlePBLTutorTurn(req, res);
      expect(getStatusCode()).toBe(404);
      expect(getBody().error).toContain('não encontrado');
    });

    it('returns deterministic fallback when GEMINI_API_KEY is not set', async () => {
      delete process.env.GEMINI_API_KEY;

      const { req, res, getStatusCode, getBody } = createMockReqRes({
        sessionId: 'test_session',
        competencyRef: 'IP-A00-G04',
        questionRef: 'OQ-A00-estrategia.4001030449',
        userMessage: 'Errei esta questão. Pode me explicar?',
        studentAttemptContext: {
          userAnswer: 'C',
          isCorrect: false,
          confidence: 'high',
          attemptStage: 'initial',
        },
      });

      await handlePBLTutorTurn(req, res);
      expect(getStatusCode()).toBe(200);

      const body = getBody();
      expect(body).toBeDefined();
      expect(body.pedagogicalText).toBeDefined();
      expect(body.pedagogicalText).toContain('Critério normativo da competência');
      expect(body.quickCheck).toBeUndefined();
      expect(body.metacognitiveInsight).toBeUndefined();
      expect(body.intent).toBe('explain_rule');
      expect(body.continuityRecommendation).toBe('try_same');
      expect(body.executionMetadata.fallback).toBe(true);
    });

    it('returns deterministic fallback when PBL_TUTOR_ENABLED is false', async () => {
      process.env.GEMINI_API_KEY = 'fake_key';
      process.env.PBL_TUTOR_ENABLED = 'false';

      const { req, res, getStatusCode, getBody } = createMockReqRes({
        sessionId: 'test_session',
        competencyRef: 'IP-A00-G04',
        questionRef: 'OQ-A00-estrategia.4001030449',
        userMessage: 'Explique a regra.',
      });

      await handlePBLTutorTurn(req, res);
      expect(getStatusCode()).toBe(200);

      const body = getBody();
      expect(body.executionMetadata.fallback).toBe(true);
    });
  });

  describe('handlePBLTutorManifest', () => {
    it('returns 200 and the complete tutor manifest with 22 shards', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes();

      await handlePBLTutorManifest(req, res);
      expect(getStatusCode()).toBe(200);

      const manifest = getBody();
      expect(manifest.schemaVersion).toBe('1.0.0');
      expect(manifest.totalQuestions).toBe(4945);
      expect(manifest.shards.length).toBeGreaterThanOrEqual(22);
    });
  });

  describe('handlePBLTutorContext — Política de Exposição Pedagógica (RGO-001)', () => {
    const questionRef = 'OQ-A00-estrategia.4001030449';

    it('antes da tentativa: resposta, solução, ponto decisivo e refutações resolutivas ocultos', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { questionRef });

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.questionRef).toBe(questionRef);
      expect(ctx.presentation.prompt).toBeDefined();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.criteria?.decisivePoint).toBeUndefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');
    });

    it('antes da tentativa + full=true: continuam estritamente ocultos (bloqueio de bypass)', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { full: 'true' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.criteria?.decisivePoint).toBeUndefined();
    });

    it('antes da tentativa + includeSolution=true: continuam estritamente ocultos (bloqueio de bypass)', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { includeSolution: 'true' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.criteria?.decisivePoint).toBeUndefined();
    });

    it('antes da tentativa + combinação de flags (full=true & includeSolution=true): continuam ocultos', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { full: 'true', includeSolution: 'true' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
    });

    it('sem tentativa real: request com hasAttempted=true&stage=intervention mantém gabarito, solução, ponto decisivo e refutações estritamente redigidos (adversarial RGO-001)', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { hasAttempted: 'true', stage: 'intervention' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.criteria?.decisivePoint).toBeUndefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');
    });

    it('com sessão ativa mas sem tentativa real nesta questão: request com hasAttempted=true continua redigido (adversarial RGO-001)', async () => {
      const { registerAuthoritativeSession, clearAuthoritativeSessions } = await import('../pblTutorServerRoute');
      clearAuthoritativeSessions();
      registerAuthoritativeSession({
        sessionId: 'session_no_attempt_123',
        phase: 'intervention',
        attempts: [
          { questionRef: 'OTHER-QUESTION-456', userAnswer: 'A' },
        ],
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { sessionId: 'session_no_attempt_123', hasAttempted: 'true', stage: 'intervention' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');
    });

    it('com tentativa real mas em etapa não autorizada pelo motor (phase=problem): tentativa de query forjada é ignorada (adversarial RGO-001)', async () => {
      const { registerAuthoritativeSession, clearAuthoritativeSessions } = await import('../pblTutorServerRoute');
      clearAuthoritativeSessions();
      registerAuthoritativeSession({
        sessionId: 'session_unauthorized_phase_123',
        phase: 'problem',
        attempts: [
          { questionRef, userAnswer: 'A' },
        ],
      });

      // Cliente tenta forjar stage=intervention na URL
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { sessionId: 'session_unauthorized_phase_123', hasAttempted: 'true', stage: 'intervention' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');
    });

    it('caso positivo: tentativa registrada realmente no estado da sessão + etapa autorizada pelo motor: resolução liberada', async () => {
      const { registerAuthoritativeSession, clearAuthoritativeSessions } = await import('../pblTutorServerRoute');
      clearAuthoritativeSessions();
      registerAuthoritativeSession({
        sessionId: 'session_authorized_456',
        userId: 'user_auth_456',
        phase: 'intervention',
        attempts: [
          { questionRef, userAnswer: 'A', isCorrect: false, sessionId: 'session_authorized_456' },
        ],
      }, 'user_auth_456');

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        { sessionId: 'session_authorized_456' },
        {},
        { userId: 'user_auth_456' }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).not.toBe('REDACTED');
      expect(ctx.presentation.officialAnswer).toBe('D');
      expect(ctx.solutionStrategy).toBeDefined();
      expect(ctx.solutionStrategy?.length).toBeGreaterThan(0);
      expect(ctx.pedagogy?.decisivePoint).toBeDefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).not.toContain('após a conclusão da etapa');
    });

    it('consumidor interno server-side: contexto completo continua disponível sem depender da rota learner-facing', async () => {
      const { pblTutorContextResolver } = await import('../PBLTutorContextResolver.server');
      const internalContext = await pblTutorContextResolver.getTutorQuestionContext(questionRef);

      expect(internalContext).toBeDefined();
      expect(internalContext?.presentation.officialAnswer).toBe('D');
      expect(internalContext?.solutionStrategy).toBeDefined();
      expect(internalContext?.solutionStrategy?.length).toBeGreaterThan(0);
      expect(internalContext?.pedagogy?.decisivePoint).toBeDefined();
      expect(internalContext?.objectiveOptionAnalyses?.length).toBeGreaterThan(0);
    });

    it('returns 404 for unknown questionRef', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { questionRef: 'OQ-UNKNOWN-9999' });

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(404);
      expect(getBody().error).toContain('não encontrada');
    });
  });

  describe('PBLSession Integration & Phase tutor Authorization (RGO-001)', () => {
    const questionRef = 'OQ-A00-estrategia.4001030449';
    const previousQuestionRef = 'OQ-A00-estrategia.4000738256';
    const defaultUserId = 'user_test_student_123';

    const makeMockSession = (overrides: Partial<PBLSession> = {}): PBLSession => ({
      sessionId: `pbl_sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      userId: defaultUserId,
      mode: 'guided',
      status: 'active',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      targetCompetencyRefs: ['IP-A00-G04'],
      currentCompetencyIndex: 0,
      currentCompetencyRef: 'IP-A00-G04',
      currentCaseRef: 'PBL-CASE-A00-G04-01',
      currentQuestionRef: questionRef,
      currentTransferItemIndex: 0,
      phase: 'problem',
      conductionMode: 'tutor',
      attempts: [],
      masterySnapshot: {},
      sessionStats: {
        initialAccuracy: 0,
        postInterventionAccuracy: 0,
        transferRate: 0,
        misconceptionsCaught: 0,
        totalTimeMs: 5000,
      },
      ...overrides,
    });

    const makeMockAttempt = (overrides: Partial<any> = {}): any => ({
      attemptId: `att_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: 'sess_default',
      questionRef,
      competencyRef: 'IP-A00-G04',
      userAnswer: 'C',
      correctAnswer: 'D',
      isCorrect: false,
      confidence: 'high',
      evaluation: 'uncalibrated_overconfident',
      stage: 'initial',
      responseTimeMs: 9000,
      detectedTrapRefs: [],
      detectedMisconceptionRefs: [],
      interventionRefs: [],
      createdAt: new Date().toISOString(),
      ...overrides,
    });

    beforeEach(() => {
      pblServerSessionRepository.clear();
    });

    it('handlePBLSessionSync rejects unauthenticated request without token (401)', async () => {
      const session = makeMockSession({ sessionId: 'sync_unauth_100' });
      const { req, res, getStatusCode, getBody } = createMockReqRes(session); // no userId in locals, no auth header

      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(401);
      expect(getBody().error).toContain('Autenticação obrigatória');
    });

    it('handlePBLSessionSync rejects forged userId that does not match authenticated token (403)', async () => {
      const session = makeMockSession({
        sessionId: 'sync_forged_101',
        userId: 'victim_user_alice',
      });
      // Authenticated as attacker Bob
      const { req, res, getStatusCode, getBody } = createMockReqRes(session, {}, {}, {}, { userId: 'attacker_user_bob' });

      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(403);
      expect(getBody().error).toContain('Acesso negado');
    });

    it('handlePBLSessionSync rejects invalid body without sessionId (400)', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, {}, {}, {}, { userId: defaultUserId });

      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('sessionId obrigatório');
    });

    it('handlePBLSessionSync rejects attempts with invalid structure or session mismatch (400)', async () => {
      const session = makeMockSession({
        sessionId: 'sess_invalid_attempt_001',
        attempts: [
          {
            attemptId: 'att_corrupted',
            sessionId: 'DIFFERENT_SESSION_ID', // mismatch
            questionRef,
            userAnswer: '', // empty
          } as any,
        ],
      });
      const { req, res, getStatusCode, getBody } = createMockReqRes(session, {}, {}, {}, { userId: defaultUserId });

      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('Tentativa inválida');
    });

    it('handlePBLSessionSync accepts valid session with attempts and stores with composite key (200)', async () => {
      const session = makeMockSession({
        sessionId: 'sync_valid_session_102',
        attempts: [
          makeMockAttempt({ sessionId: 'sync_valid_session_102' }),
        ],
      });
      const { req, res, getStatusCode, getBody } = createMockReqRes(session, {}, {}, {}, { userId: defaultUserId });

      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(200);
      expect(getBody()).toEqual({ ok: true, sessionId: 'sync_valid_session_102' });

      // Available to authenticated owner
      const storedOwner = await pblServerSessionRepository.getSession('sync_valid_session_102', defaultUserId);
      expect(storedOwner).toBeDefined();
      expect(storedOwner?.sessionId).toBe('sync_valid_session_102');

      // Unavailable to other user
      const storedOther = await pblServerSessionRepository.getSession('sync_valid_session_102', 'other_user_xyz');
      expect(storedOther).toBeNull();
    });

    it('stale out-of-order session snapshot does not overwrite newer session state', async () => {
      const sessionNewer = makeMockSession({
        sessionId: 'sess_order_test_001',
        updatedAt: '2026-09-07T15:00:00.000Z',
        phase: 'tutor',
      });
      await pblServerSessionRepository.saveSession(sessionNewer, defaultUserId);

      // Attempt to save an older snapshot of the same session
      const sessionOlder = makeMockSession({
        sessionId: 'sess_order_test_001',
        updatedAt: '2026-09-07T14:00:00.000Z',
        phase: 'problem',
      });
      await pblServerSessionRepository.saveSession(sessionOlder, defaultUserId);

      const stored = await pblServerSessionRepository.getSession('sess_order_test_001', defaultUserId);
      expect(stored?.phase).toBe('tutor');
      expect(stored?.updatedAt).toBe('2026-09-07T15:00:00.000Z');
    });

    it('positive test 1: asking for help before answering persists session but keeps resolution strictly protected (hideAnswer: true)', async () => {
      // Student opens tutor / asks for help before answering (no attempts yet)
      const session = makeMockSession({
        sessionId: 'sess_help_before_answer_001',
        phase: 'tutor',
        attempts: [],
      });

      // 1. Session is successfully saved on server
      const { req: reqSync, res: resSync, getStatusCode: getSyncStatus } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(reqSync, resSync);
      expect(getSyncStatus()).toBe(200);

      // 2. Querying context for tutor returns presentation, but resolution remains REDACTED
      const { req: reqCtx, res: resCtx, getStatusCode: getCtxStatus, getBody } = createMockReqRes(
        {},
        { questionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(reqCtx, resCtx);
      expect(getCtxStatus()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation).toBeDefined();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
    });

    it('positive test 2: intervention on previous attempt remains authorized after engine advances currentQuestionRef to next question', async () => {
      // Student attempted previousQuestionRef, but engine has now advanced currentQuestionRef to next questionRef
      const session = makeMockSession({
        sessionId: 'sess_advanced_engine_001',
        currentQuestionRef: questionRef, // engine advanced to Q2
        phase: 'intervention',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_advanced_engine_001',
            questionRef: previousQuestionRef, // attempt was on Q1
            userAnswer: 'C',
            isCorrect: false,
          }),
        ],
      });

      await pblServerSessionRepository.saveSession(session, defaultUserId);

      // Query context specifically for previousQuestionRef (Q1)
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef: previousQuestionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      // Because previousQuestionRef has a valid attempt in this session, resolution is authorized!
      expect(ctx.presentation.officialAnswer).not.toBe('REDACTED');
      expect(ctx.presentation.officialAnswer).toBe('D');
      expect(ctx.solutionStrategy).toBeDefined();
      expect(ctx.pedagogy?.decisivePoint).toBeDefined();
    });

    it('integration: genuine attempt registration via PBLSessionRepository.saveSession authorizes context in phase tutor', async () => {
      // 1. Student enters session in phase 'problem' with tutor conduction mode
      const session = makeMockSession({
        sessionId: 'sess_prod_journey_001',
        conductionMode: 'tutor',
        phase: 'problem',
        attempts: [],
      });

      await PBLSessionRepository.saveSession(session);

      // 2. Student queries tutor context before answering
      const reqBefore = createMockReqRes(
        {},
        { questionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(reqBefore.req, reqBefore.res);
      expect(reqBefore.getStatusCode()).toBe(200);

      const ctxBefore = reqBefore.getBody();
      expect(ctxBefore.presentation.officialAnswer).toBe('REDACTED');
      expect(ctxBefore.solutionStrategy).toBeUndefined();
      expect(ctxBefore.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctxBefore.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');

      // 3. Adversarial query with client-forged flags is strictly ignored
      const reqAdversarial = createMockReqRes(
        {},
        { questionRef },
        { hasAttempted: 'true', stage: 'intervention', full: 'true' },
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(reqAdversarial.req, reqAdversarial.res);
      expect(reqAdversarial.getStatusCode()).toBe(200);

      const ctxAdv = reqAdversarial.getBody();
      expect(ctxAdv.presentation.officialAnswer).toBe('REDACTED');
      expect(ctxAdv.solutionStrategy).toBeUndefined();
      expect(ctxAdv.pedagogy?.decisivePoint).toBeUndefined();

      // 4. Student submits a genuine attempt -> session moves to phase 'tutor'
      session.phase = 'tutor';
      session.attempts = [
        makeMockAttempt({
          sessionId: session.sessionId,
          questionRef,
          userAnswer: 'C',
          isCorrect: false,
        }),
      ];
      session.currentTutorEpisodeId = 'ep_001';

      // Re-save session via PBLSessionRepository.saveSession (as done in product runtime)
      await PBLSessionRepository.saveSession(session);

      // 5. Query tutor context again with session ID
      const reqAfter = createMockReqRes(
        {},
        { questionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(reqAfter.req, reqAfter.res);
      expect(reqAfter.getStatusCode()).toBe(200);

      const ctxAfter = reqAfter.getBody();
      expect(ctxAfter.presentation.officialAnswer).not.toBe('REDACTED');
      expect(ctxAfter.presentation.officialAnswer).toBe('D');
      expect(ctxAfter.solutionStrategy).toBeDefined();
      expect(ctxAfter.solutionStrategy?.length).toBeGreaterThan(0);
      expect(ctxAfter.pedagogy?.decisivePoint).toBeDefined();
      expect(ctxAfter.objectiveOptionAnalyses?.[0]?.refutation).not.toContain('após a conclusão da etapa');
    });

    it('phase tutor without genuine attempt on target questionRef remains strictly redacted', async () => {
      const session = makeMockSession({
        sessionId: 'sess_tutor_no_attempt_002',
        conductionMode: 'tutor',
        phase: 'tutor',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_tutor_no_attempt_002',
            questionRef: 'OTHER-QUESTION-1234',
            userAnswer: 'A',
            isCorrect: false,
            confidence: 'medium',
            responseTimeMs: 6000,
          }),
        ],
      });

      await PBLSessionRepository.saveSession(session);

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: defaultUserId }
      );
      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
      expect(ctx.objectiveOptionAnalyses?.[0]?.refutation).toContain('após a conclusão da etapa');
    });

    it('cross-user boundary prevents leaking post-attempt resolution between different users', async () => {
      const session = makeMockSession({
        sessionId: 'sess_alice_003',
        userId: 'user_alice_456',
        conductionMode: 'tutor',
        phase: 'tutor',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_alice_003',
            questionRef,
            userAnswer: 'C',
            isCorrect: false,
            confidence: 'high',
            responseTimeMs: 7000,
          }),
        ],
      });

      await pblServerSessionRepository.saveSession(session, 'user_alice_456');

      // Bob requests Alice's session
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef },
        {},
        { 'x-pbl-session-id': session.sessionId },
        { userId: 'user_bob_789' } // Authenticated as Bob!
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      // Since Bob is not authorized to read Alice's session, answer is strictly redacted!
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
    });

    it('public or unauthenticated query to context returns safe masked projection', async () => {
      // Query without any userId or authorization token
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        {},
        { questionRef }
      );

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.presentation).toBeDefined();
      expect(ctx.presentation.officialAnswer).toBe('REDACTED');
      expect(ctx.solutionStrategy).toBeUndefined();
      expect(ctx.pedagogy?.decisivePoint).toBeUndefined();
    });

    it('PBLSessionRepository.saveSession with guest user skips remote sync and persists locally', async () => {
      const guestSession = makeMockSession({
        sessionId: 'sess_guest_local_only',
        userId: 'guest',
      });

      const result = await PBLSessionRepository.saveSession(guestSession);
      expect(result.syncedRemotely).toBe(false);

      // Verify that remote server repository was NOT populated
      const serverStored = await pblServerSessionRepository.getSession('sess_guest_local_only', 'guest');
      expect(serverStored).toBeNull();
    });

    it('handlePBLSessionSync rejects attempt pointing to non-existent questionRef (400)', async () => {
      const session = makeMockSession({
        sessionId: 'sess_bad_question_001',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_bad_question_001',
            questionRef: 'NON-EXISTENT-QUESTION-REF-999',
            userAnswer: 'A',
          }),
        ],
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('não encontrada no acervo');
    });

    it('handlePBLSessionSync rejects answer that does not match available options (e.g. banana in options A-E) (400)', async () => {
      // questionRef has options A, B, C, D, E. "banana" is invalid!
      const session = makeMockSession({
        sessionId: 'sess_bad_answer_format_001',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_bad_answer_format_001',
            questionRef,
            userAnswer: 'banana',
          }),
        ],
      });

      const { req, res, getStatusCode, getBody } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(400);
      expect(getBody().error).toContain('não corresponde a uma opção válida');
    });

    it('handlePBLSessionSync enforces server evaluative authority: recalculates isCorrect and correctAnswer from canonical source', async () => {
      // Client maliciously claims isCorrect: true and correctAnswer: 'A' when official answer is 'D'
      const session = makeMockSession({
        sessionId: 'sess_forged_eval_001',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_forged_eval_001',
            questionRef,
            userAnswer: 'C', // Official answer is 'D', so 'C' is INCORRECT
            correctAnswer: 'C', // Client forged
            isCorrect: true, // Client forged
          }),
        ],
      });

      const { req, res, getStatusCode } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(200);

      // Verify the persisted state in server repository: client's forged claim was overwritten by server!
      const stored = await pblServerSessionRepository.getSession('sess_forged_eval_001', defaultUserId);
      expect(stored).toBeDefined();
      expect(stored?.attempts[0].correctAnswer).toBe('D'); // Canonical official answer
      expect(stored?.attempts[0].isCorrect).toBe(false); // Server-calculated
      expect(stored?.attempts[0].evaluation).toBe('high_confidence_error'); // Server-evaluated
    });

    it('handlePBLSessionSync rejects truncation of attempt history (append-only violation) (400)', async () => {
      // 1. Initial valid sync with 2 attempts
      const initialSession = makeMockSession({
        sessionId: 'sess_append_only_001',
        attempts: [
          makeMockAttempt({
            attemptId: 'att_001',
            sessionId: 'sess_append_only_001',
            questionRef,
            userAnswer: 'A',
          }),
          makeMockAttempt({
            attemptId: 'att_002',
            sessionId: 'sess_append_only_001',
            questionRef: previousQuestionRef,
            userAnswer: 'D',
          }),
        ],
      });

      const { req: req1, res: res1, getStatusCode: getStatus1 } = createMockReqRes(
        initialSession,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req1, res1);
      expect(getStatus1()).toBe(200);

      // 2. Incoming snapshot removes the second attempt (truncation)
      const truncatedSession = makeMockSession({
        sessionId: 'sess_append_only_001',
        attempts: [
          makeMockAttempt({
            attemptId: 'att_001',
            sessionId: 'sess_append_only_001',
            questionRef,
            userAnswer: 'A',
          }),
        ],
      });

      const { req: req2, res: res2, getStatusCode: getStatus2, getBody: getBody2 } = createMockReqRes(
        truncatedSession,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req2, res2);
      expect(getStatus2()).toBe(400);
      expect(getBody2().error).toContain('Tentativa violada');
    });

    it('handlePBLSessionSync rejects retroactive modification of previous userAnswer (immutability violation) (400)', async () => {
      // 1. Initial valid sync with attempt att_001 having userAnswer 'A'
      const initialSession = makeMockSession({
        sessionId: 'sess_immutability_001',
        attempts: [
          makeMockAttempt({
            attemptId: 'att_001',
            sessionId: 'sess_immutability_001',
            questionRef,
            userAnswer: 'A',
          }),
        ],
      });

      const { req: req1, res: res1, getStatusCode: getStatus1 } = createMockReqRes(
        initialSession,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req1, res1);
      expect(getStatus1()).toBe(200);

      // 2. Client attempts to retroactively change att_001's userAnswer to 'D'
      const modifiedSession = makeMockSession({
        sessionId: 'sess_immutability_001',
        attempts: [
          makeMockAttempt({
            attemptId: 'att_001',
            sessionId: 'sess_immutability_001',
            questionRef,
            userAnswer: 'D', // modified retroactively!
          }),
        ],
      });

      const { req: req2, res: res2, getStatusCode: getStatus2, getBody: getBody2 } = createMockReqRes(
        modifiedSession,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req2, res2);
      expect(getStatus2()).toBe(400);
      expect(getBody2().error).toContain('Tentativa violada');
    });

    it('pblServerSessionRepository.saveSession serializes concurrent writes and maintains ordering', async () => {
      const sessionId = 'sess_concurrent_queue_001';
      const snap1 = makeMockSession({
        sessionId,
        updatedAt: '2026-09-07T16:00:00.000Z',
        phase: 'problem',
      });
      const snap2 = makeMockSession({
        sessionId,
        updatedAt: '2026-09-07T16:01:00.000Z',
        phase: 'tutor',
      });
      const snap3 = makeMockSession({
        sessionId,
        updatedAt: '2026-09-07T16:02:00.000Z',
        phase: 'intervention',
      });

      // Fire concurrent saves
      const [res1, res2, res3] = await Promise.all([
        pblServerSessionRepository.saveSession(snap1, defaultUserId),
        pblServerSessionRepository.saveSession(snap2, defaultUserId),
        pblServerSessionRepository.saveSession(snap3, defaultUserId),
      ]);

      expect(res1.saved).toBe(true);
      expect(res2.saved).toBe(true);
      expect(res3.saved).toBe(true);

      const finalState = await pblServerSessionRepository.getSession(sessionId, defaultUserId);
      expect(finalState?.phase).toBe('intervention');
      expect(finalState?.updatedAt).toBe('2026-09-07T16:02:00.000Z');
    });

    it('handlePBLSessionSync treats question with missing or redacted official answer as unassessed and clears client-forged evaluation', async () => {
      // Mock pblTutorContextResolver.getTutorQuestionContext to simulate a question without an officialAnswer
      const { pblTutorContextResolver } = await import('../PBLTutorContextResolver.server');
      const realGetCtx = pblTutorContextResolver.getTutorQuestionContext.bind(pblTutorContextResolver);

      const spy = vi.spyOn(pblTutorContextResolver, 'getTutorQuestionContext').mockImplementation(async (ref, comp) => {
        if (ref === 'OQ-NO-ANSWER-TEST') {
          return {
            presentation: {
              prompt: 'Questão em auditoria',
              officialAnswer: 'REDACTED',
              isUnavailable: true,
              options: [{ label: 'A', text: 'Opção A' }, { label: 'B', text: 'Opção B' }],
            },
          } as any;
        }
        return realGetCtx(ref, comp);
      });

      const session = makeMockSession({
        sessionId: 'sess_unassessed_001',
        attempts: [
          makeMockAttempt({
            sessionId: 'sess_unassessed_001',
            questionRef: 'OQ-NO-ANSWER-TEST',
            userAnswer: 'A',
            isCorrect: true, // Malicious client claim
            correctAnswer: 'A', // Malicious client claim
            evaluation: 'strong_correct', // Malicious client claim
          }),
        ],
      });

      const { req, res, getStatusCode } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(200);

      const stored = await pblServerSessionRepository.getSession('sess_unassessed_001', defaultUserId);
      expect(stored).toBeDefined();
      expect(stored?.attempts[0].correctAnswer).toBeUndefined();
      expect(stored?.attempts[0].isCorrect).toBe(false);
      expect(stored?.attempts[0].evaluation).toBe('unassessed');

      spy.mockRestore();
    });

    it('handlePBLSessionSync returns 500 when remote persistence fails, leaving persistence unconfirmed', async () => {
      const spy = vi.spyOn(pblServerSessionRepository, 'saveSession').mockResolvedValueOnce({
        saved: false,
        reason: 'invalid_session',
      });

      const session = makeMockSession({ sessionId: 'sess_fail_remote_001' });
      const { req, res, getStatusCode, getBody } = createMockReqRes(
        session,
        {},
        {},
        {},
        { userId: defaultUserId }
      );
      await handlePBLSessionSync(req, res);
      expect(getStatusCode()).toBe(500);
      expect(getBody().error).toContain('Falha na persistência remota');

      spy.mockRestore();
    });
  });
});
