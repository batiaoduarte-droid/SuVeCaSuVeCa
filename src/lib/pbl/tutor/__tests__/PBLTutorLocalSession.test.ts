import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { createRequireApiUser } from '../../../auth/requireApiUser.server';
import { handlePBLSessionSync, handlePBLTutorTurn } from '../pblTutorServerRoute';
import { pblTutorContextResolver } from '../PBLTutorContextResolver.server';
import { pblServerSessionRepository } from '../../server/PBLServerSessionRepository';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent }; },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' },
}));

async function request(handler: typeof handlePBLTutorTurn, body: unknown, userId: string) {
  const headers: Record<string, string> = { authorization: 'Bearer local-dev-token', 'x-local-user-id': userId };
  const req = { body, headers, header: (name: string) => headers[name] } as Request;
  const res = { locals: {}, status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn();
  await createRequireApiUser(null)(req, res, next);
  if (next.mock.calls.length) await handler(req, res);
  return res;
}

describe('local Professor PBL session with the published incident question', () => {
  afterEach(() => { pblServerSessionRepository.clear(); vi.unstubAllEnvs(); generateContent.mockReset(); });
  it('recognizes the personal local attempt, includes the actual commentary and isolates another account', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('PBL_TUTOR_ENABLED', 'true');
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generateContent.mockResolvedValue({ text: JSON.stringify({ pedagogicalText: 'Resposta simulada para verificar somente o transporte do contexto.' }) });
    const context = await pblTutorContextResolver.getTutorQuestionContext('OQ-A00-aula00.q0002');
    expect(context).not.toBeNull();
    const questionRef = context!.questionRef;
    const competencyRef = context!.primaryCompetencyRef!;
    const sessionId = 'local-regression-session';
    const episodeId = 'local-regression-episode';
    const userId = 'local-user-regression_owner';
    const attempt = { attemptId: 'local-regression-attempt', sessionId, questionRef, competencyRef,
      stage: 'initial', userAnswer: 'A', confidence: 'high', isCorrect: true,
      reasoning: 'Apliquei a regra do S intervocálico.', createdAt: '2026-09-21T12:00:00.000Z' };
    const session = { sessionId, userId, phase: 'tutor', updatedAt: '2026-09-21T12:01:00.000Z', attempts: [attempt],
      currentTutorEpisodeId: episodeId, tutorEpisodes: { [episodeId]: { episodeId, sessionId, questionRef, competencyRef,
        attemptId: attempt.attemptId, attemptStage: 'initial', startedAt: '2026-09-21T12:01:00.000Z', turns: [] } } };
    const sync = await request(handlePBLSessionSync, session, userId);
    expect(sync.locals.userId).toBe(userId);
    expect(sync.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    const stored = await pblServerSessionRepository.getSession(sessionId, userId);
    expect(stored?.attempts[0].isCorrect).toBe(false);
    const body = { sessionId, episodeId, questionRef, competencyRef, expectedAttemptId: attempt.attemptId,
      userMessage: "Como contar fonemas em 'sintaxe' passo a passo?", directExplanationRequested: true };
    await request(handlePBLTutorTurn, body, userId);
    const prompt = generateContent.mock.calls[0][0].contents;
    expect(prompt).toContain(context!.officialCommentary);
    expect(prompt).toContain(context!.objectiveOptionAnalyses!.find((item) => item.label === 'B')!.refutation);
    expect(prompt).toContain('Gabarito Oficial: D');
    expect(prompt).toContain(attempt.reasoning);
    expect(prompt).toContain('explicação didática derivada');
    expect(prompt).not.toContain('RESERVADO ATÉ A SUBMISSÃO');
    expect(prompt).not.toContain('FONTE FACTUAL INEGOCIÁVEL');
    generateContent.mockClear();
    const other = await request(handlePBLTutorTurn, body, 'local-user-other_account');
    expect(other.status).toHaveBeenCalledWith(409);
    expect(generateContent).not.toHaveBeenCalled();
  });
});
