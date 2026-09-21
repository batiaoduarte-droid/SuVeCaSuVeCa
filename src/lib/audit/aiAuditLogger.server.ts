import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { TechnicalAttempt } from '../ai/geminiKeyManager.server';

export interface AuditContext {
  app?: string;
  feature?: string;
  userId?: string;
  sessionId?: string;
  questionRef?: string;
  competencyRef?: string;
  [key: string]: any;
}

export interface AuditRequestConfig {
  provider?: string;
  route: string;
  stage?: string;
  modelRequested: string;
  promptVersion?: string;
  systemPrompt?: string;
  userInput?: string;
  fullPrompt?: string;
  config?: Record<string, any>;
  context?: AuditContext;
}

export interface AuditRecordOptions {
  status: 'concluida' | 'erro_provider' | 'erro_parse';
  request: AuditRequestConfig;
  attempts: TechnicalAttempt[];
  response?: any;
  parseStatus?: 'ok' | 'error';
  parseError?: string | null;
  error?: { type: string; message: string } | null;
  startTime?: number;
  endTime?: number;
}

export class AIAuditLogger {
  private auditBaseDir: string | null = null;
  private warnedDir = false;

  constructor(private options: { directory?: string; allowTestWrites?: boolean } = {}) {}

  private isTestExecution(): boolean {
    return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      let text = value;
      for (const [name, secret] of Object.entries(process.env)) {
        if (/(?:API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)/i.test(name) && secret && secret.length >= 8) {
          text = text.split(secret).join('[REDACTED]');
        }
      }
      return text.replace(/Bearer\s+[^\s"']+/gi, 'Bearer [REDACTED]')
        .replace(/AIza[\w-]{30,}/g, '[REDACTED]');
    }
    if (Array.isArray(value)) return value.map((item) => this.sanitize(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key,
        /^(?:authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|private[_-]?key)$/i.test(key)
          ? '[REDACTED]' : this.sanitize(item),
      ]));
    }
    return value;
  }

  private resolveAuditDirectory(): string | null {
    if (this.isTestExecution() && !(this.options.allowTestWrites && this.options.directory)) return null;
    if (this.options.directory) return this.options.directory;
    if (this.auditBaseDir) return this.auditBaseDir;

    // 1. Variável explícita de ambiente
    if (process.env.AI_AUDIT_DIR && fs.existsSync(process.env.AI_AUDIT_DIR)) {
      this.auditBaseDir = process.env.AI_AUDIT_DIR;
      return this.auditBaseDir;
    }

    // 2. Diretório canônico do ecossistema Notebook LM
    const canonicalNotebookLmAuditDir = 'C:\\Users\\origi\\OneDrive\\Desktop\\Códigos\\portugues\\Notebook LM\\05_Auditorias\\ia';
    if (fs.existsSync(canonicalNotebookLmAuditDir)) {
      this.auditBaseDir = canonicalNotebookLmAuditDir;
      return this.auditBaseDir;
    }

    // 3. Diretório local do projeto (modo autônomo offline)
    const localDir = path.join(process.cwd(), '.auditorias', 'ia');
    try {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      this.auditBaseDir = localDir;
      return this.auditBaseDir;
    } catch {
      if (!this.warnedDir) {
        console.warn('[AIAuditLogger] Nenhum diretório de auditoria acessível. Gravação em disco desativada.');
        this.warnedDir = true;
      }
      return null;
    }
  }

  private sha256(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  private formatIsoWithMicroseconds(d = new Date()): string {
    const iso = d.toISOString(); // YYYY-MM-DDTHH:mm:ss.sssZ
    return iso;
  }

  private getRunId(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const s = String(date.getUTCSeconds()).padStart(2, '0');
    const pid = process.pid || 1000;
    const rnd = crypto.randomBytes(4).toString('hex');
    return `${y}${m}${day}T${h}${min}${s}Z-${pid}-${rnd}`;
  }

  /**
   * Grava a chamada de IA assincronamente no padrão Notebook LM Schema v1.
   * Não lança erro caso falhe para não interromper a resposta da aplicação.
   */
  public async logCall(options: AuditRecordOptions): Promise<string | null> {
    try {
      const baseDir = this.resolveAuditDirectory();
      if (!baseDir) return null;

      const now = new Date();
      const callId = crypto.randomUUID().replace(/-/g, '');
      const runId = this.getRunId(now);
      const createdAt = options.startTime
        ? this.formatIsoWithMicroseconds(new Date(options.startTime))
        : this.formatIsoWithMicroseconds(now);
      const updatedAt = options.endTime
        ? this.formatIsoWithMicroseconds(new Date(options.endTime))
        : this.formatIsoWithMicroseconds(now);

      const sysPrompt = options.request.systemPrompt || '';
      const usrInput = options.request.userInput || options.request.fullPrompt || '';
      const fullContent = `${sysPrompt}\n---\n${usrInput}`;

      const sysPromptSha = sysPrompt ? this.sha256(sysPrompt) : null;
      const usrInputSha = usrInput ? this.sha256(usrInput) : null;
      const requestSha = this.sha256(fullContent);

      const record = {
        schema_version: 1,
        capture_version: 2,
        execution_mode: this.isTestExecution() ? 'test' : 'runtime',
        call_id: callId,
        run_id: runId,
        status: options.status,
        created_at: createdAt,
        updated_at: updatedAt,
        context: {
          app: 'SuVeCa',
          ...(options.request.context || {}),
        },
        request: {
          provider: options.request.provider || 'gemini',
          route: options.request.route,
          stage: options.request.stage || 'turn',
          model_requested: options.request.modelRequested,
          system_prompt_chars: sysPrompt.length,
          user_input_chars: usrInput.length,
          system_prompt_sha256: sysPromptSha,
          user_input_sha256: usrInputSha,
          request_sha256: requestSha,
          system_prompt: sysPrompt,
          user_input: usrInput,
          config: options.request.config || {},
          versions: {
            prompt: options.request.promptVersion || null,
            parser: null,
            postprocessor: null,
          },
        },
        technical_attempts: options.attempts,
        response: options.response !== undefined ? options.response : null,
        parse: {
          status: options.parseStatus || (options.status === 'concluida' ? 'ok' : 'error'),
          expected_type: 'json_schema',
          actual_type: typeof options.response === 'object' ? 'dict' : typeof options.response,
          error: options.parseError || null,
        },
        result_links: [],
        error: options.error || null,
      };

      // Organizar por subpasta YYYY-MM-DD
      const dateFolder = now.toISOString().slice(0, 10);
      const targetDir = path.join(baseDir, 'chamadas', dateFolder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const safeRecord = this.sanitize(record);
      safeRecord.request.prompt_redacted = safeRecord.request.system_prompt !== sysPrompt || safeRecord.request.user_input !== usrInput;
      safeRecord.request.captured_request_sha256 = this.sha256(`${safeRecord.request.system_prompt}\n---\n${safeRecord.request.user_input}`);
      const filePath = path.join(targetDir, `${callId}.json`);
      try {
        await fs.promises.writeFile(filePath, JSON.stringify(safeRecord, null, 2), 'utf8');
      } catch (err: any) {
        console.warn('[AIAuditLogger] Falha ao escrever arquivo de auditoria:', err?.message);
      }

      return callId;
    } catch (err: any) {
      console.warn('[AIAuditLogger] Erro ao processar log de auditoria:', err?.message);
      return null;
    }
  }
}

export const aiAuditLogger = new AIAuditLogger();
