import { describe, expect, it, vi } from 'vitest';
import { GeminiKeyManager } from '../geminiKeyManager.server';

describe('GeminiKeyManager', () => {
  it('identifica e normaliza chaves sem expor segredos', () => {
    const manager = new GeminiKeyManager();
    const pool = manager.getKeyPool();

    expect(Array.isArray(pool)).toBe(true);
    if (pool.length > 0) {
      for (const entry of pool) {
        expect(entry.label).toBeDefined();
        expect(entry.fingerprint).toHaveLength(12);
        expect(/^[0-9a-f]{12}$/.test(entry.fingerprint)).toBe(true);
        expect(entry.key).toBeDefined();
      }
    }
  });

  it('detecta erros de cota e rate limit com precisão', () => {
    const manager = new GeminiKeyManager();

    expect(manager.isQuotaError({ status: 429 })).toBe(true);
    expect(manager.isQuotaError({ statusCode: 429 })).toBe(true);
    expect(manager.isQuotaError(new Error('Your project has exceeded a quota.'))).toBe(true);
    expect(manager.isQuotaError(new Error('RESOURCE_EXHAUSTED'))).toBe(true);
    expect(manager.isQuotaError(new Error('RateLimitError: too_many_requests'))).toBe(true);
    expect(manager.isQuotaError(new Error('Invalid argument or malformed request'))).toBe(false);
  });

  it('rotaciona chave e registra tentativas técnicas ao atingir erro 429', async () => {
    const manager = new GeminiKeyManager();
    // Injetar 2 chaves simuladas para teste
    (manager as any).keys = [
      { label: 'KEY_TEST_1', key: 'mock-key-1', fingerprint: '111111111111' },
      { label: 'KEY_TEST_2', key: 'mock-key-2', fingerprint: '222222222222' },
    ];
    (manager as any).activeIndex = 0;

    let calls = 0;
    const mockOperation = vi.fn().mockImplementation(async (_client, keyEntry) => {
      calls++;
      if (calls === 1) {
        const err: any = new Error('Quota exceeded for model');
        err.status = 429;
        throw err;
      }
      return { text: 'Sucesso na segunda chave', keyUsed: keyEntry.label };
    });

    const execution = await manager.executeWithKeyRotation('gemini-3.1-flash-lite', mockOperation, {
      maxAttempts: 2,
    });

    expect((execution.result as any).text).toBe('Sucesso na segunda chave');
    expect(execution.attempts).toHaveLength(2);
    expect(execution.attempts[0].outcome).toBe('error');
    expect(execution.attempts[0].error_type).toBe('RateLimitError');
    expect(execution.attempts[0].key_label).toBe('KEY_TEST_1');

    expect(execution.attempts[1].outcome).toBe('success');
    expect(execution.attempts[1].key_label).toBe('KEY_TEST_2');
  });
});
