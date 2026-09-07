import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import {
  handlePBLTutorTurn,
  handlePBLTutorManifest,
  handlePBLTutorContext,
} from '../pblTutorServerRoute';

function createMockReqRes(body: any = {}, params: any = {}) {
  const req = {
    body,
    params,
  } as unknown as Request;

  let statusCode = 200;
  let jsonBody: any = null;

  const res = {
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
  });

  afterEach(() => {
    process.env = originalEnv;
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
      expect(body.pedagogicalText).toContain('infinitivo pessoal');
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
      expect(manifest.shards.length).toBe(22);
    });
  });

  describe('handlePBLTutorContext', () => {
    it('returns 200 with question context for valid questionRef', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { questionRef: 'OQ-A00-estrategia.4001030449' });

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(200);

      const ctx = getBody();
      expect(ctx.questionRef).toBe('OQ-A00-estrategia.4001030449');
      expect(ctx.presentation.prompt).toBeDefined();
    });

    it('returns 404 for unknown questionRef', async () => {
      const { req, res, getStatusCode, getBody } = createMockReqRes({}, { questionRef: 'OQ-UNKNOWN-9999' });

      await handlePBLTutorContext(req, res);
      expect(getStatusCode()).toBe(404);
      expect(getBody().error).toContain('não encontrada');
    });
  });
});
