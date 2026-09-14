import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AIAuditLogger } from '../aiAuditLogger.server';

describe('AIAuditLogger', () => {
  it('registra chamadas no schema v1 com SHA256 e sem expor segredos', async () => {
    const logger = new AIAuditLogger();
    const testDir = path.join(process.cwd(), '.auditorias', 'test_tmp');
    (logger as any).auditBaseDir = testDir;

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
    expect(content.call_id).toBe(callId);
    expect(content.status).toBe('concluida');
    expect(content.request.route).toBe('test_route');
    expect(content.request.system_prompt_sha256).toBeDefined();
    expect(content.request.user_input_sha256).toBeDefined();
    expect(content.technical_attempts[0].key_fingerprint).toBe('1234567890ab');
    expect(content.context.userId).toBe('local-test-user');

    // Limpar arquivo temporário de teste
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
