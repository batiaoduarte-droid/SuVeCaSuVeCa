import { afterEach, describe, expect, it, vi } from 'vitest';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { AIAuditLogger } from '../aiAuditLogger.server';

describe('AIAuditLogger', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('registra chamadas no schema v1 com SHA256 e sem expor segredos', async () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-audit-'));
    const logger = new AIAuditLogger({ directory: testDir, allowTestWrites: true });

    const callId = await logger.logCall({
      status: 'concluida',
      request: {
        route: 'test_route',
        stage: 'unit_test',
        modelRequested: 'gemini-3.1-flash-lite',
        systemPrompt: 'Instrução do sistema para teste',
        userInput: 'Entrada do estudante para teste',
        config: { temperature: 0.2 },
        context: { userId: 'local-test-user', feature: 'unit_test' },
      },
      attempts: [
        {
          attempt: 1,
          model: 'gemini-3.1-flash-lite',
          key_label: 'GEMINI_API_KEY_TEST',
          key_fingerprint: '1234567890ab',
          outcome: 'success',
          error_code: null,
          error_type: null,
          error: null,
          elapsed_seconds: 0.42,
          raw_response_sha256: null,
          payload_path: null,
        },
      ],
      response: { pedagogicalText: 'Explicação gerada com sucesso.' },
    });

    expect(callId).toBeDefined();
    expect(callId).toHaveLength(32);

    const dateFolder = new Date().toISOString().slice(0, 10);
    const auditFilePath = path.join(testDir, 'chamadas', dateFolder, `${callId}.json`);

    expect(fs.existsSync(auditFilePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(auditFilePath, 'utf8'));
    expect(content.schema_version).toBe(1);
    expect(content.execution_mode).toBe('test');
    expect(content.request.user_input).toBe('Entrada do estudante para teste');
    expect(content.request.user_input_sha256).toBe(crypto.createHash('sha256').update(content.request.user_input).digest('hex'));
    expect(content.request.prompt_redacted).toBe(false);
    expect(content.call_id).toBe(callId);
    expect(content.status).toBe('concluida');
    expect(content.request.route).toBe('test_route');
    expect(content.request.system_prompt_sha256).toBeDefined();
    expect(content.request.user_input_sha256).toBeDefined();
    expect(content.technical_attempts[0].key_fingerprint).toBe('1234567890ab');
    expect(content.context.userId).toBe('local-test-user');

    // Limpar arquivo temporário de teste
    expect(path.dirname(path.resolve(testDir))).toBe(path.resolve(os.tmpdir()));
    fs.rmSync(testDir, { recursive: true, force: true });
  });
  it('does not write ordinary Vitest calls into runtime audit directories', async () => {
    const write = vi.spyOn(fs.promises, 'writeFile');
    const logger = new AIAuditLogger();
    expect(await logger.logCall({ status: 'concluida', request: { route: 'pbl_tutor', modelRequested: 'test' }, attempts: [] })).toBeNull();
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it('redacts credentials from prompt, nested config and errors while retaining fingerprints', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'suveca-audit-'));
    try {
      vi.stubEnv('GEMINI_API_KEY', 'private-test-secret-123');
      const logger = new AIAuditLogger({ directory, allowTestWrites: true });
      const id = await logger.logCall({ status: 'erro_provider', request: {
        route: 'pbl_tutor', modelRequested: 'test', userInput: 'private-test-secret-123',
        config: { nested: { apiKey: 'arbitrary-secret', authorization: 'Bearer credential' }, key_fingerprint: 'abc' },
      }, attempts: [], error: { type: 'APIError', message: 'Bearer credential' } });
      const raw = fs.readFileSync(path.join(directory, 'chamadas', new Date().toISOString().slice(0, 10), `${id}.json`), 'utf8');
      expect(raw).not.toContain('private-test-secret-123');
      expect(raw).not.toContain('arbitrary-secret');
      expect(raw).not.toContain('Bearer credential');
      const record = JSON.parse(raw);
      expect(record.request.prompt_redacted).toBe(true);
      expect(record.request.config.key_fingerprint).toBe('abc');
    } finally {
      expect(path.dirname(path.resolve(directory))).toBe(path.resolve(os.tmpdir()));
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
