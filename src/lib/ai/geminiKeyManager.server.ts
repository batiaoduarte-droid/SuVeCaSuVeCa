import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { createAiDeadline, waitForAiRetry, withAiSignal } from './aiRequest';

export function classifyGeminiError(error: any): 'quota' | 'unavailable' | 'network' | 'timeout' | 'cancelled' | 'fatal' {
  const seen = new Set<unknown>();
  for (let current = error; current && !seen.has(current); current = current.cause) {
    seen.add(current);
    const status = Number(current.status || current.statusCode || current.response?.status);
    if (status === 429 || status === 403) return 'quota';
    if ([500, 502, 503, 504].includes(status)) return 'unavailable';
    if (status >= 400 && status < 500) return 'fatal';
    if (current.code === 'AI_TIMEOUT' || current.message === 'AI_TIMEOUT' || current.name === 'TimeoutError') return 'timeout';
    if (current.name === 'AbortError') return 'cancelled';
    if (['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'UND_ERR_SOCKET',
      'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH'].includes(current.code)) return 'network';
  }
  const message = String(error?.message || error?.error || '').toLowerCase();
  if (/quota|rate.?limit|too_many_requests|resource_exhausted|denied access|permission_denied/.test(message)) return 'quota';
  if (/high demand|unavailable|overloaded/.test(message)) return 'unavailable';
  // An opaque fetch failure alone is not enough to retry certificate/configuration errors.
  return 'fatal';
}

export interface KeyEntry {
  label: string;
  key: string;
  fingerprint: string;
}

export interface TechnicalAttempt {
  attempt: number;
  model: string;
  key_label: string;
  key_fingerprint: string;
  outcome: 'success' | 'error';
  error_code: string | number | null;
  error_type: string | null;
  error: string | null;
  elapsed_seconds: number;
  raw_response_sha256: string | null;
  payload_path: string | null;
  response_metadata?: Record<string, any>;
}

export class GeminiKeyManager {
  private keys: KeyEntry[] = [];
  private activeIndex = 0;
  private initialized = false;
  private lastEnvKey: string | undefined = undefined;

  constructor() {
    this.initializePool();
  }

  public initializePool(force = false): void {
    if (!force && this.initialized && this.keys.length > 0) return;
    this.lastEnvKey = process.env.GEMINI_API_KEY;

    const discoveredKeys: KeyEntry[] = [];
    const seenKeys = new Set<string>();

    const addKey = (label: string, rawKey: string | undefined) => {
      if (!rawKey) return;
      const key = rawKey.trim();
      if (!key || key.startsWith('${') || seenKeys.has(key)) return;
      seenKeys.add(key);
      const fingerprint = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12);
      discoveredKeys.push({ label, key, fingerprint });
    };

    // 1. Verificar chaves em process.env
    for (const [envVar, value] of Object.entries(process.env)) {
      if (/^GEMINI_API_KEY(_\d+)?$/i.test(envVar)) {
        addKey(envVar.toUpperCase(), value);
      }
    }

    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

    // 2. Se nenhuma chave ou se estivermos em ambiente local de desenvolvimento,
    // tentar carregar o arquivo canônico do Notebook LM (apenas fora de testes automatizados)
    const notebookLmEnvPath = 'C:\\Users\\origi\\OneDrive\\Desktop\\Códigos\\portugues\\Notebook LM\\.env';
    if (!isTestEnv && process.env.NODE_ENV !== 'production' && fs.existsSync(notebookLmEnvPath)) {
      try {
        const content = fs.readFileSync(notebookLmEnvPath, 'utf8');
        const lines = content.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^(GEMINI_API_KEY(_\d+)?)\s*=\s*(.*)$/);
          if (match) {
            const label = match[1].toUpperCase();
            let val = match[3].trim();
            // Remover aspas envolventes se existirem
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            addKey(label, val);
          }
        }
      } catch (err) {
        console.warn('[GeminiKeyManager] Não foi possível ler o .env do Notebook LM:', (err as any)?.message);
      }
    }

    // 3. Fallbacks adicionais
    if (discoveredKeys.length === 0) {
      if (process.env.VITE_GEMINI_API_KEY) {
        addKey('VITE_GEMINI_API_KEY', process.env.VITE_GEMINI_API_KEY);
      }
    }

    // Ordenar para garantir previsibilidade (GEMINI_API_KEY principal primeiro, depois _1, _2...)
    discoveredKeys.sort((a, b) => {
      if (a.label === 'GEMINI_API_KEY') return -1;
      if (b.label === 'GEMINI_API_KEY') return 1;
      const numA = parseInt(a.label.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.label.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });

    this.keys = discoveredKeys;
    this.initialized = true;

    // Se process.env.GEMINI_API_KEY ainda não estiver definido e tivermos chaves,
    // exporta a primeira chave para manter compatibilidade com bibliotecas antigas (fora de testes)
    if (!isTestEnv && !process.env.GEMINI_API_KEY && this.keys.length > 0) {
      this.lastEnvKey = this.keys[0].key;
      process.env.GEMINI_API_KEY = this.keys[0].key;
    }

    if (this.keys.length > 0 && !isTestEnv) {
      console.log(`[GeminiKeyManager] Pool inicializado com ${this.keys.length} chave(s) do Gemini.`);
    } else if (!isTestEnv) {
      console.warn('[GeminiKeyManager] Nenhuma chave do Gemini encontrada.');
    }
  }

  public getKeyPool(): readonly KeyEntry[] {
    if (this.keys.length === 0 || process.env.GEMINI_API_KEY !== this.lastEnvKey) {
      this.initializePool(true);
    }
    return this.keys;
  }

  public getActiveKey(): KeyEntry | null {
    if (this.keys.length === 0 || process.env.GEMINI_API_KEY !== this.lastEnvKey) {
      this.initializePool(true);
    }
    if (this.keys.length === 0) return null;
    return this.keys[this.activeIndex % this.keys.length];
  }

  public rotateKey(): KeyEntry | null {
    if (this.keys.length <= 1) return this.getActiveKey();
    this.activeIndex = (this.activeIndex + 1) % this.keys.length;
    const current = this.keys[this.activeIndex % this.keys.length];
    if (current) {
      this.lastEnvKey = current.key;
      process.env.GEMINI_API_KEY = current.key;
    }
    return current;
  }

  public getGenAIClient(keyEntry?: KeyEntry | null, userAgent = 'suveca-ai-engine'): GoogleGenAI {
    const active = keyEntry || this.getActiveKey();
    if (!active?.key) {
      throw new Error('GEMINI_API_KEY não configurada ou pool vazio.');
    }
    return new GoogleGenAI({
      apiKey: active.key,
      httpOptions: {
        headers: {
          'User-Agent': userAgent,
        },
      },
    });
  }

  public isQuotaError(err: any): boolean {
    return classifyGeminiError(err) === 'quota';
  }

  /**
   * Executa uma operação com a chave atual. Se houver erro de cota (429 / quota exceeded),
   * rotaciona a chave e tenta novamente, registrando cada tentativa técnica.
   */
  public async executeWithKeyRotation<T>(
    model: string,
    operation: (client: GoogleGenAI, keyEntry: KeyEntry, signal?: AbortSignal) => Promise<T>,
    options: {
      maxAttempts?: number;
      userAgent?: string;
      signal?: AbortSignal;
      attemptTimeoutMs?: number;
    } = {}
  ): Promise<{ result: T; attempts: TechnicalAttempt[]; effectiveKey: KeyEntry }> {
    const active = this.getActiveKey();
    const poolSize = this.keys.length;
    const maxAttempts = options.maxAttempts ?? 5;
    const attempts: TechnicalAttempt[] = [];

    if (poolSize === 0 || !active) {
      throw new Error('Nenhuma chave Gemini disponível no pool para execução.');
    }

    let lastError: any = null;
    let currentKey = active;

    try {
      for (let attemptNum = 1; attemptNum <= maxAttempts; attemptNum++) {
        options.signal?.throwIfAborted();
        const client = this.getGenAIClient(currentKey, options.userAgent);
        const startTime = Date.now();
        const deadline = options.attemptTimeoutMs === undefined ? undefined : createAiDeadline(options.attemptTimeoutMs, options.signal);
        const signal = deadline?.signal || options.signal;

        try {
          const result = signal
            ? await withAiSignal(() => operation(client, currentKey, signal), signal)
            : await operation(client, currentKey);
          const elapsed = (Date.now() - startTime) / 1000;

          attempts.push({
            attempt: attemptNum,
            model,
            key_label: currentKey.label,
            key_fingerprint: currentKey.fingerprint,
            outcome: 'success',
            error_code: null,
            error_type: null,
            error: null,
            elapsed_seconds: Number(elapsed.toFixed(3)),
            raw_response_sha256: null,
            payload_path: null,
            response_metadata: (result as any)?.usageMetadata
              ? { usage: (result as any).usageMetadata }
              : undefined,
          });

          return { result, attempts, effectiveKey: currentKey };
        } catch (err: any) {
          const elapsed = (Date.now() - startTime) / 1000;
          const kind = classifyGeminiError(err);
          const errorType = kind === 'quota' ? 'RateLimitError' : kind;
          const errorMessage = String(err.message || err);

          attempts.push({
            attempt: attemptNum,
            model,
            key_label: currentKey.label,
            key_fingerprint: currentKey.fingerprint,
            outcome: 'error',
            error_code: err.status || err.statusCode || err.code || err.cause?.code || null,
            error_type: errorType,
            error: errorMessage,
            elapsed_seconds: Number(elapsed.toFixed(3)),
            raw_response_sha256: null,
            payload_path: null,
          });

          lastError = err;

          deadline?.dispose();
          options.signal?.throwIfAborted();
          if (!err.noRetry && (['quota', 'network', 'unavailable'].includes(kind) || (kind === 'timeout' && deadline)) && attemptNum < maxAttempts) {
            const delayMs = Math.min(1000 * Math.pow(2, attemptNum - 1), 5000);
            console.warn(
              `[GeminiKeyManager] ${kind}: aguardando ${delayMs}ms; ${kind === 'quota' ? 'rotacionando chave' : 'mantendo chave'} (tentativa ${attemptNum + 1}/${maxAttempts}).`
            );
            await waitForAiRetry(delayMs, options.signal);
            if (kind === 'quota') currentKey = this.rotateKey()!;
            continue;
          }

          // Se não for erro de cota ou acabaram as tentativas, interrompe
          throw err;
        } finally {
          deadline?.dispose();
        }
      }

      throw lastError;
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      Object.assign(failure, { attempts });
      throw failure;
    }
  }
}

export const geminiKeyManager = new GeminiKeyManager();
