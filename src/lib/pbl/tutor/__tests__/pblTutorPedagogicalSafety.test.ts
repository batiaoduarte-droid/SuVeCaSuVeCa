import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import type { PBLSession, PBLAttempt, PBLTutorEpisode } from '../../../../types/pbl';
import type { PBLTutorQuestionContext } from '../../../../types/pblTutor';
import { handlePBLTutorTurn } from '../pblTutorServerRoute';
import { pblTutorContextResolver } from '../PBLTutorContextResolver.server';
import { pblServerSessionRepository } from '../../server/PBLServerSessionRepository';
import { getEpisodeAttempt, validateQuickCheck } from '../pblTutorPedagogy';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent }; },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' },
}));

const context: PBLTutorQuestionContext = {
  questionRef: 'Q1', primaryCompetencyRef: 'COMP1',
  presentation: { prompt: 'Questão em análise', officialAnswer: 'B', options: [{ label: 'A', text: 'Primeira hipótese' }, { label: 'B', text: 'Segunda hipótese' }] },
  officialCommentary: 'RESOLUÇÃO RESERVADA',
  solutionStrategy: [{ stepNumber: 1, action: 'PASSO RESERVADO' }],
  criteria: { rules: [{ ruleRef: 'RULE1', title: 'Regra de apoio', statement: 'Confira as condições de aplicação.' }], procedures: [], contrasts: [{ contrastRef: 'CONTRAST1', title: 'Dois casos válidos', poleA: 'Vou à Roma antiga', poleB: 'Vou a Roma', decisionCriterion: 'Presença de determinação.' }] },
  curriculum: {}, provenance: {},
};
const attempt = { attemptId: 'ATT1', sessionId: 'S1', questionRef: 'Q1', competencyRef: 'COMP1', stage: 'initial', userAnswer: 'A', isCorrect: false, confidence: 'medium', createdAt: '2026-09-08T12:00:00.000Z' } as PBLAttempt;
const episode = { episodeId: 'EP1', sessionId: 'S1', questionRef: 'Q1', competencyRef: 'COMP1', attemptStage: 'initial', attemptId: 'ATT1', startedAt: '2026-09-08T12:01:00.000Z', turns: [], assistanceLevel: 'none' } as unknown as PBLTutorEpisode;
const session = { sessionId: 'S1', userId: 'U1', phase: 'tutor', attempts: [attempt], currentTutorEpisodeId: 'EP1', tutorEpisodes: { EP1: episode } } as unknown as PBLSession;

async function turn(extra = {}, userId: string | undefined = 'U1') {
  const req = { body: { sessionId: 'S1', episodeId: 'EP1', questionRef: 'Q1', competencyRef: 'COMP1', userMessage: 'Explique diretamente.', directExplanationRequested: true, studentAttemptContext: { userAnswer: 'B', isCorrect: true, confidence: 'high', attemptStage: 'transfer' }, ...extra } } as unknown as Request;
  const res = { locals: { userId }, json: vi.fn(), status: vi.fn().mockReturnThis() } as unknown as Response;
  await handlePBLTutorTurn(req, res);
  return vi.mocked(res.json).mock.calls[0]?.[0];
}

describe('pedagogical safeguards at the tutor boundary', () => {
  beforeEach(() => {
    vi.stubEnv('PBL_TUTOR_ENABLED', 'false');
    vi.spyOn(pblTutorContextResolver, 'getTutorQuestionContext').mockResolvedValue(structuredClone(context));
    vi.spyOn(pblServerSessionRepository, 'getSession').mockResolvedValue(structuredClone(session));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); generateContent.mockReset(); });

  it('redacts pre-attempt context even with forged correctness and direct explanation', async () => {
    vi.mocked(pblServerSessionRepository.getSession).mockResolvedValue({ ...session, attempts: [] });
    const result = await turn();
    expect(result.pedagogicalText).not.toContain('RESOLUÇÃO RESERVADA');
    expect(result.pedagogicalText).toContain('Confira as condições');
    expect(result.metacognitiveInsight).toBeUndefined();
    expect(result.quickCheck).toBeUndefined();
  });

  it('uses the saved attempt, including medium confidence, instead of request assertions', async () => {
    const result = await turn();
    expect(result.pedagogicalText).toContain('RESOLUÇÃO RESERVADA');
    expect(result.metacognitiveInsight).toBeUndefined();
    expect(result.quickCheck).toBeUndefined(); // Both contrast poles are valid, not a binary quiz.
  });

  it('does not unlock the solution with an attempt on another question or episode', async () => {
    const result = await turn({ episodeId: 'EP_OTHER' });
    expect(result.pedagogicalText).not.toContain('RESOLUÇÃO RESERVADA');
    expect(getEpisodeAttempt({ ...session, attempts: [{ ...attempt, questionRef: 'Q2' }] }, episode)).toBeUndefined();
  });

  it('sends a redacted context to the model and omits solution activities before submission', async () => {
    vi.stubEnv('PBL_TUTOR_ENABLED', 'true'); vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.mocked(pblServerSessionRepository.getSession).mockResolvedValue({ ...session, attempts: [] });
    generateContent.mockResolvedValue({ text: JSON.stringify({ pedagogicalText: 'Confira a condição.', intent: 'invented', continuityRecommendation: 'invented', sourceRefs: ['RULE1', 'invented'], reasoningChips: ['Como aplicar?', 123], quickCheck: validCheck, notebookDraft: { title: 'Resposta', triggerCondition: 'Item', decisionRule: 'B', contrastExample: 'B' } }) });
    const result = await turn();
    const prompt = generateContent.mock.calls[0][0].contents;
    expect(prompt).not.toContain('RESOLUÇÃO RESERVADA');
    expect(prompt).not.toContain('PASSO RESERVADO');
    expect(prompt).toContain('RESERVADO ATÉ A SUBMISSÃO');
    expect(result.quickCheck).toBeUndefined();
    expect(result.notebookDraft).toBeUndefined();
    expect(result.intent).toBe('explain_rule');
    expect(result.continuityRecommendation).toBe('try_same');
    expect(result.sourceRefs).toEqual(['RULE1']);
    expect(result.reasoningChips).toEqual(['Como aplicar?']);
  });

  it('accepts a structurally valid grounded activity only after a saved attempt', async () => {
    vi.stubEnv('PBL_TUTOR_ENABLED', 'true'); vi.stubEnv('GEMINI_API_KEY', 'test-key');
    generateContent.mockResolvedValue({ text: JSON.stringify({ pedagogicalText: 'Confira a condição.', quickCheck: validCheck }) });
    expect((await turn()).quickCheck).toEqual(validCheck);
  });

  it('keeps the fallback redacted when the model fails before an attempt', async () => {
    vi.stubEnv('PBL_TUTOR_ENABLED', 'true'); vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.mocked(pblServerSessionRepository.getSession).mockResolvedValue({ ...session, attempts: [] });
    generateContent.mockRejectedValue(new Error('MODEL_FAILED'));
    const result = await turn();
    expect(result.executionMetadata.fallback).toBe(true);
    expect(result.pedagogicalText).not.toContain('RESOLUÇÃO RESERVADA');
  });
});

const validCheck = { prompt: 'Qual condição deve ser verificada?', options: [{ label: 'A', text: 'A condição publicada' }, { label: 'B', text: 'Somente a aparência' }], correctOption: 'A', explanation: 'A decisão exige verificar a condição da regra.', sourceRefs: ['RULE1'] };

describe('quick check validation and episode identity', () => {
  it.each([
    { ...validCheck, correctOption: 'C' },
    { ...validCheck, options: [{ label: 'A', text: 'Um' }, { label: 'a', text: 'Outro' }] },
    { ...validCheck, options: [{ label: 'A', text: 'Mesmo' }, { label: 'B', text: 'mesmo' }] },
    { ...validCheck, explanation: '' },
    { ...validCheck, sourceRefs: ['UNKNOWN'] },
    { ...validCheck, sourceRefs: [] },
  ])('rejects malformed or unsupported activity %#', (check) => {
    expect(validateQuickCheck(check, new Set(['RULE1']))).toBeUndefined();
  });

  it('does not treat a draft or a later attempt as the episode origin', () => {
    const oldEpisode = { ...episode, attemptId: undefined, initialUserAnswer: 'A' };
    expect(getEpisodeAttempt(session, oldEpisode)?.attemptId).toBe('ATT1');
    expect(getEpisodeAttempt(session, { ...oldEpisode, initialUserAnswer: undefined })).toBeUndefined();
    expect(getEpisodeAttempt({ ...session, attempts: [{ ...attempt, createdAt: '2026-09-08T12:02:00.000Z' }] }, oldEpisode)).toBeUndefined();
  });
});
