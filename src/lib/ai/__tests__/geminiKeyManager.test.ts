import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiKeyManager, classifyGeminiError } from '../geminiKeyManager.server';
import { createAiDeadline } from '../aiRequest';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function simulatedManager() {
  vi.stubEnv('GEMINI_API_KEY', 'mock-key-1');
  const manager = new GeminiKeyManager();
  (manager as any).keys = [
    { label: 'KEY_TEST_1', key: 'mock-key-1', fingerprint: '111111111111' },
    { label: 'KEY_TEST_2', key: 'mock-key-2', fingerprint: '222222222222' },
  ];
  return manager;
}

describe('Gemini retries and cancellation', () => {
  it('allows professor quota rotation beyond five attempts within the deadline', async () => {
    vi.useFakeTimers();
    const manager = simulatedManager();
    const operation = vi.fn().mockRejectedValue({ status: 429 });
    for (let index = 0; index < 6; index++) operation.mockRejectedValueOnce({ status: 429 });
    operation.mockResolvedValueOnce('ok');
    const deadline = createAiDeadline(90_000);
    const result = manager.executeWithKeyRotation('test', operation, { maxAttempts: 12, signal: deadline.signal });
    await vi.advanceTimersByTimeAsync(23_000);
    expect((await result).attempts).toHaveLength(7);
    deadline.dispose();
  });
  it('separates overload, network, quota and permanent errors', () => {
    expect(classifyGeminiError({ status: 503 })).toBe('unavailable');
    expect(classifyGeminiError({ status: 429 })).toBe('quota');
    expect(classifyGeminiError({ status: 403, message: 'unavailable' })).toBe('fatal');
    expect(classifyGeminiError(new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }))).toBe('network');
    expect(classifyGeminiError(new TypeError('fetch failed', { cause: { code: 'CERT_HAS_EXPIRED' } }))).toBe('fatal');
  });

  it.each([
    new TypeError('fetch failed', { cause: { code: 'UND_ERR_CONNECT_TIMEOUT' } }),
    Object.assign(new Error('overloaded'), { status: 503 }),
  ])('retries a transient failure with the same key', async error => {
    vi.useFakeTimers();
    const manager = simulatedManager();
    const rotate = vi.spyOn(manager, 'rotateKey');
    const operation = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('ok');
    const pending = manager.executeWithKeyRotation('test', operation, { maxAttempts: 2 });
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.result).toBe('ok');
    expect(result.attempts.map(a => a.key_label)).toEqual(['KEY_TEST_1', 'KEY_TEST_1']);
    expect(rotate).not.toHaveBeenCalled();
  });

  it('cancels the in-flight attempt at the total deadline and retains audit attempts', async () => {
    vi.useFakeTimers();
    const manager = simulatedManager();
    const deadline = createAiDeadline(250);
    let received: AbortSignal | undefined;
    const operation = vi.fn((_client, _key, signal) => { received = signal; return new Promise(() => {}); });
    const pending = manager.executeWithKeyRotation('test', operation, { signal: deadline.signal, attemptTimeoutMs: 1000 }).catch(e => e);
    await vi.advanceTimersByTimeAsync(250);
    const error = await pending;
    expect(error.code).toBe('AI_TIMEOUT');
    expect(error.attempts).toHaveLength(1);
    expect(received?.aborted).toBe(true);
    expect(operation).toHaveBeenCalledTimes(1);
    deadline.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a timed-out attempt before retrying and succeeds on the same key', async () => {
    vi.useFakeTimers();
    const manager = simulatedManager();
    const signals: AbortSignal[] = [];
    const operation = vi.fn((_client, _key, signal) => {
      signals.push(signal);
      return signals.length === 1 ? new Promise(() => {}) : Promise.resolve('recovered');
    });
    const result = manager.executeWithKeyRotation('test', operation, { maxAttempts: 2, attemptTimeoutMs: 100 });
    await vi.runAllTimersAsync();
    expect((await result).result).toBe('recovered');
    expect(signals[0].aborted).toBe(true);
    expect(operation.mock.calls[0][1]).toEqual(operation.mock.calls[1][1]);
  });

  it('does not retry or rotate after cancellation during backoff', async () => {
    vi.useFakeTimers();
    const manager = simulatedManager();
    const rotate = vi.spyOn(manager, 'rotateKey');
    const deadline = createAiDeadline(100);
    const operation = vi.fn().mockRejectedValue({ status: 429 });
    const pending = manager.executeWithKeyRotation('test', operation, { signal: deadline.signal }).catch(e => e);
    await vi.advanceTimersByTimeAsync(100);
    expect((await pending).code).toBe('AI_TIMEOUT');
    expect(operation).toHaveBeenCalledTimes(1);
    expect(rotate).not.toHaveBeenCalled();
    deadline.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
});

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
