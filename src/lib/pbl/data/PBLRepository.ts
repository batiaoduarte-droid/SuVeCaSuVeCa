import type {
  PBLCompetency,
  PBLCase,
  QuestionPedagogy,
  QuestionCompetencyLink,
  PBLDiagnosticPath,
  PBLTransferSet,
  PBLCumulativeSession,
  PBLManifest,
  PBLRuntimeShardDataset,
  PBLRuntimeShardManifest,
  PBLQuestionPresentation,
} from '../../../types/pbl';
import { fetchNormalizedQuestion } from '../../officialQuestionsLoader';
import { formatOfficialContent } from '../../officialContent';

export interface IPBLRepository {
  init(): Promise<void>;
  isReady(): boolean;

  getCompetency(id: string): Promise<PBLCompetency | null>;
  getAllCompetencies(): Promise<PBLCompetency[]>;
  getCompetenciesForUnit(unitId: string): Promise<PBLCompetency[]>;
  getCompetenciesForLesson(lessonId: string): Promise<PBLCompetency[]>;

  getCase(id: string): Promise<PBLCase | null>;
  getCaseForCompetency(competencyId: string): Promise<PBLCase | null>;
  getAllCases(): Promise<PBLCase[]>;

  getQuestionPedagogy(questionId: string): Promise<QuestionPedagogy | null>;
  getQuestionCompetencyLink(questionId: string): Promise<QuestionCompetencyLink | null>;
  getQuestionPresentation(questionId: string): Promise<PBLQuestionPresentation | null>;
  getRulePresentation(unitId: string, ruleRef: string): Promise<PBLRulePresentation | null>;

  getDiagnosticPath(id: string): Promise<PBLDiagnosticPath | null>;
  getDiagnosticPathForCompetency(competencyId: string): Promise<PBLDiagnosticPath | null>;

  getTransferSet(id: string): Promise<PBLTransferSet | null>;
  getTransferSetForCompetency(competencyId: string): Promise<PBLTransferSet | null>;

  getCumulativeSessions(): Promise<PBLCumulativeSession[]>;
  getCumulativeSession(sessionId: string): Promise<PBLCumulativeSession | null>;

  getManifest(): Promise<PBLManifest | null>;
}

export interface PBLRulePresentation {
  ruleRef: string;
  title: string;
  statement: string;
}

interface PedagogicalUnitView {
  officialQuestions?: Array<Record<string, unknown>>;
  sections?: {
    rules?: {
      items?: Array<{
        entityId?: string;
        title?: string;
        statement?: string;
      }>;
    };
  };
}

const normalizedRuleRef = (value: string) => String(value || '')
  .trim()
  .toUpperCase()
  .replace(/^RULF-/, 'RULE-')
  .replace(/-(\d+)$/, (_match, digits) => `-${Number(digits)}`);

export class PBLRepository implements IPBLRepository {
  private competencies: Map<string, PBLCompetency> = new Map();
  private cases: Map<string, PBLCase> = new Map();
  private caseByCompetency: Map<string, PBLCase> = new Map();
  private transferSets: Map<string, PBLTransferSet> = new Map();
  private transferByCompetency: Map<string, PBLTransferSet> = new Map();
  private diagnosticPaths: Map<string, PBLDiagnosticPath> = new Map();
  private diagnosticByCompetency: Map<string, PBLDiagnosticPath> = new Map();
  private cumulativeSessions: Map<string, PBLCumulativeSession> = new Map();
  private questionPedagogyMap: Map<string, QuestionPedagogy> = new Map();
  private questionLinksMap: Map<string, QuestionCompetencyLink> = new Map();
  private questionPresentations: Map<string, PBLQuestionPresentation> = new Map();
  private unitViewCache: Map<string, PedagogicalUnitView> = new Map();
  private manifest: PBLManifest | null = null;
  private initialized = false;

  constructor(private basePath: string = '/knowledge/pbl') {}

  private reset(): void {
    this.competencies.clear();
    this.cases.clear();
    this.caseByCompetency.clear();
    this.transferSets.clear();
    this.transferByCompetency.clear();
    this.diagnosticPaths.clear();
    this.diagnosticByCompetency.clear();
    this.cumulativeSessions.clear();
    this.questionPedagogyMap.clear();
    this.questionLinksMap.clear();
    this.questionPresentations.clear();
    this.unitViewCache.clear();
    this.manifest = null;
    this.initialized = false;
  }

  private async safeFetchJson<T>(url: string): Promise<T | null> {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        console.warn(`[PBLRepository] Esperava JSON de ${url}, mas recebeu HTML.`);
        return null;
      }
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        console.warn(`[PBLRepository] Resposta de ${url} não é um JSON válido.`);
        return null;
      }
      return JSON.parse(text) as T;
    } catch (err) {
      console.warn(`[PBLRepository] Erro ao carregar ${url}:`, err);
      return null;
    }
  }

  private async fetchRequiredText(url: string): Promise<string> {
    let response: Response;
    try {
      response = await fetch(url, { headers: { Accept: 'application/json' } });
    } catch (error) {
      throw new Error(`Falha ao buscar o artefato PBL obrigatório ${url}.`, { cause: error });
    }
    if (!response.ok) {
      throw new Error(`Artefato PBL obrigatório ausente ou inacessível: ${url} (HTTP ${response.status}).`);
    }
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (contentType.includes('text/html') || !text || text.trim().startsWith('<')) {
      throw new Error(`Artefato PBL obrigatório inválido: ${url} não retornou JSON.`);
    }
    return text;
  }

  private async fetchRequiredJson<T>(url: string): Promise<T> {
    const text = await this.fetchRequiredText(url);
    try {
      return JSON.parse(text) as T;
    } catch (error) {
      throw new Error(`JSON inválido no artefato PBL obrigatório ${url}.`, { cause: error });
    }
  }

  private async sha256(text: string): Promise<string> {
    if (!globalThis.crypto?.subtle) {
      throw new Error('Web Crypto indisponível; não é possível validar os shards PBL com segurança.');
    }
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private async fetchShardedRecord<T>(dataset: PBLRuntimeShardDataset): Promise<Record<string, T>> {
    if (!Array.isArray(dataset.shards) || dataset.shards.length === 0) {
      throw new Error('Manifesto PBL não declara shards para um dataset obrigatório.');
    }
    const parts = await Promise.all(dataset.shards.map(async (shard) => {
      const url = `${this.basePath}/${shard.file}`;
      const text = await this.fetchRequiredText(url);
      const bytes = new TextEncoder().encode(text).byteLength;
      if (bytes !== shard.bytes) {
        throw new Error(`Shard PBL truncado ou divergente: ${url} (${bytes}/${shard.bytes} bytes).`);
      }
      const digest = await this.sha256(text);
      if (digest !== shard.sha256) {
        throw new Error(`Hash SHA-256 divergente no shard PBL ${url}.`);
      }
      let payload: Record<string, T>;
      try {
        payload = JSON.parse(text) as Record<string, T>;
      } catch (error) {
        throw new Error(`JSON inválido no shard PBL ${url}.`, { cause: error });
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error(`Shard PBL ${url} não contém um objeto indexado.`);
      }
      const entries = Object.entries(payload);
      if (entries.length !== shard.recordCount) {
        throw new Error(`Contagem divergente no shard PBL ${url}: ${entries.length}/${shard.recordCount}.`);
      }
      if (entries[0]?.[0] !== shard.firstQuestionRef || entries.at(-1)?.[0] !== shard.lastQuestionRef) {
        throw new Error(`Fronteiras de IDs divergentes no shard PBL ${url}.`);
      }
      return entries;
    }));

    const combined: Record<string, T> = {};
    for (const [questionRef, record] of parts.flat()) {
      if (Object.prototype.hasOwnProperty.call(combined, questionRef)) {
        throw new Error(`Referência duplicada entre shards PBL: ${questionRef}.`);
      }
      combined[questionRef] = record;
    }
    if (Object.keys(combined).length !== dataset.totalRecords) {
      throw new Error(`Dataset PBL shardado incompleto: ${Object.keys(combined).length}/${dataset.totalRecords}.`);
    }
    return combined;
  }

  public isReady(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    this.reset();
    try {
      const manData = await this.fetchRequiredJson<PBLManifest>(`${this.basePath}/pbl_manifest.json`);
      const runtimeManifestFile = manData.runtimeProjection?.manifestFile || 'pbl_runtime_manifest.json';
      const runtimeManifest = await this.fetchRequiredJson<PBLRuntimeShardManifest>(
        `${this.basePath}/${runtimeManifestFile}`,
      );
      if (runtimeManifest.kind !== 'suveca-pbl-runtime-shards' || runtimeManifest.schemaVersion !== '1.0.0') {
        throw new Error('Manifesto de shards PBL ausente ou incompatível.');
      }

      const [compsData, casesData, xfersData, diagsData, sessData, qclData, qpData, authoredData] = await Promise.all([
        this.fetchRequiredJson<PBLCompetency[]>(`${this.basePath}/pbl_competency_map.json`),
        this.fetchRequiredJson<PBLCase[]>(`${this.basePath}/pbl_cases.json`),
        this.fetchRequiredJson<PBLTransferSet[]>(`${this.basePath}/pbl_transfer_sets.json`),
        this.fetchRequiredJson<PBLDiagnosticPath[]>(`${this.basePath}/pbl_diagnostic_paths.json`),
        this.fetchRequiredJson<PBLCumulativeSession[]>(`${this.basePath}/pbl_cumulative_review_sessions.json`),
        this.fetchShardedRecord<QuestionCompetencyLink>(runtimeManifest.datasets.questionCompetencyLinks),
        this.fetchShardedRecord<QuestionPedagogy>(runtimeManifest.datasets.questionPedagogy),
        this.fetchRequiredJson<Record<string, PBLQuestionPresentation>>(`${this.basePath}/pbl_authored_questions.json`),
      ]);

      if (![compsData, casesData, xfersData, diagsData, sessData].every(Array.isArray)) {
        throw new Error('Um artefato estrutural PBL obrigatório não contém uma lista válida.');
      }
      const expectedLinks = manData.totalRuntimeQuestionLinks ?? manData.totalQuestionLinks;
      const expectedPedagogy = manData.totalRuntimeQuestionPedagogy ?? manData.totalQuestionPedagogy;
      const expectedAuthored = manData.totalRuntimeAuthoredQuestions ?? manData.totalAuthoredQuestions ?? 0;
      const countChecks = [
        [compsData.length, manData.totalCompetencies, 'competências'],
        [casesData.length, manData.totalPBLCases, 'casos'],
        [xfersData.length, manData.totalTransferSets, 'conjuntos de transferência'],
        [diagsData.length, manData.totalDiagnosticPaths, 'caminhos diagnósticos'],
        [sessData.length, manData.totalCumulativeSessions, 'sessões cumulativas'],
        [Object.keys(qclData).length, expectedLinks, 'vínculos questão–competência'],
        [Object.keys(qpData).length, expectedPedagogy, 'pedagogias de questão'],
        [Object.keys(authoredData).length, expectedAuthored, 'questões autorais'],
      ] as const;
      for (const [actual, expected, label] of countChecks) {
        if (typeof expected !== 'number' || actual !== expected) {
          throw new Error(`Base PBL incompleta: ${label} ${actual}/${String(expected)}.`);
        }
      }
      if (
        runtimeManifest.datasets.questionCompetencyLinks.totalRecords !== expectedLinks
        || runtimeManifest.datasets.questionPedagogy.totalRecords !== expectedPedagogy
      ) {
        throw new Error('As contagens do manifesto de shards divergem do manifesto pedagógico PBL.');
      }

      compsData.forEach((competency) => this.competencies.set(competency.competencyId, competency));
      casesData.forEach((pblCase) => {
        this.cases.set(pblCase.caseId, pblCase);
        this.caseByCompetency.set(pblCase.competencyRef, pblCase);
      });
      xfersData.forEach((transferSet) => {
        this.transferSets.set(transferSet.transferSetId, transferSet);
        this.transferByCompetency.set(transferSet.competencyRef, transferSet);
      });
      diagsData.forEach((diagnosticPath) => {
        this.diagnosticPaths.set(diagnosticPath.pathId, diagnosticPath);
        this.diagnosticByCompetency.set(diagnosticPath.competencyRef, diagnosticPath);
      });
      sessData.forEach((session) => this.cumulativeSessions.set(session.sessionId, session));
      Object.entries(qclData).forEach(([questionRef, link]) => this.questionLinksMap.set(questionRef, link));
      Object.entries(qpData).forEach(([questionRef, pedagogy]) => this.questionPedagogyMap.set(questionRef, pedagogy));
      Object.entries(authoredData).forEach(([questionRef, presentation]) =>
        this.questionPresentations.set(questionRef, presentation)
      );
      this.manifest = manData;

      this.initialized = true;
    } catch (err) {
      this.reset();
      console.error('[PBLRepository] Error initializing PBL Repository:', err);
      throw err;
    }
  }

  // Pre-load data synchronously for testing or offline bundles
  public loadDirectly(data: {
    competencies?: PBLCompetency[];
    cases?: PBLCase[];
    transferSets?: PBLTransferSet[];
    diagnosticPaths?: PBLDiagnosticPath[];
    cumulativeSessions?: PBLCumulativeSession[];
    questionPedagogyMap?: Record<string, QuestionPedagogy>;
    questionLinksMap?: Record<string, QuestionCompetencyLink>;
    questionPresentations?: Record<string, PBLQuestionPresentation>;
    manifest?: PBLManifest;
  }): void {
    if (data.competencies) data.competencies.forEach((c) => this.competencies.set(c.competencyId, c));
    if (data.cases) {
      data.cases.forEach((cs) => {
        this.cases.set(cs.caseId, cs);
        this.caseByCompetency.set(cs.competencyRef, cs);
      });
    }
    if (data.transferSets) {
      data.transferSets.forEach((x) => {
        this.transferSets.set(x.transferSetId, x);
        this.transferByCompetency.set(x.competencyRef, x);
      });
    }
    if (data.diagnosticPaths) {
      data.diagnosticPaths.forEach((d) => {
        this.diagnosticPaths.set(d.pathId, d);
        this.diagnosticByCompetency.set(d.competencyRef, d);
      });
    }
    if (data.cumulativeSessions) {
      data.cumulativeSessions.forEach((s) => this.cumulativeSessions.set(s.sessionId, s));
    }
    if (data.questionPedagogyMap) {
      Object.entries(data.questionPedagogyMap).forEach(([qid, qp]) =>
        this.questionPedagogyMap.set(qid, qp)
      );
    }
    if (data.questionLinksMap) {
      Object.entries(data.questionLinksMap).forEach(([qid, link]) =>
        this.questionLinksMap.set(qid, link)
      );
    }
    if (data.questionPresentations) {
      Object.entries(data.questionPresentations).forEach(([qid, presentation]) =>
        this.questionPresentations.set(qid, presentation)
      );
    }
    if (data.manifest) this.manifest = data.manifest;
    this.initialized = true;
  }

  public async getCompetency(id: string): Promise<PBLCompetency | null> {
    return this.competencies.get(id) || null;
  }

  public async getAllCompetencies(): Promise<PBLCompetency[]> {
    return Array.from(this.competencies.values());
  }

  public async getCompetenciesForUnit(unitId: string): Promise<PBLCompetency[]> {
    return Array.from(this.competencies.values()).filter((c) => c.unitId === unitId);
  }

  public async getCompetenciesForLesson(lessonId: string): Promise<PBLCompetency[]> {
    return Array.from(this.competencies.values()).filter((c) => c.lessonId === lessonId);
  }

  public async getCase(id: string): Promise<PBLCase | null> {
    return this.cases.get(id) || null;
  }

  public async getCaseForCompetency(competencyId: string): Promise<PBLCase | null> {
    return this.caseByCompetency.get(competencyId) || null;
  }

  public async getAllCases(): Promise<PBLCase[]> {
    return Array.from(this.cases.values());
  }

  public async getQuestionPedagogy(questionId: string): Promise<QuestionPedagogy | null> {
    return this.questionPedagogyMap.get(questionId) || null;
  }

  public async getQuestionCompetencyLink(questionId: string): Promise<QuestionCompetencyLink | null> {
    return this.questionLinksMap.get(questionId) || null;
  }

  private async getUnitView(unitId: string): Promise<PedagogicalUnitView | null> {
    const cached = this.unitViewCache.get(unitId);
    if (cached) return cached;
    const view = await this.safeFetchJson<PedagogicalUnitView>(
      `/knowledge/pedagogical/views/${unitId}.json`
    );
    if (view) this.unitViewCache.set(unitId, view);
    return view;
  }

  public async getRulePresentation(
    unitId: string,
    ruleRef: string
  ): Promise<PBLRulePresentation | null> {
    if (!unitId || !ruleRef) return null;
    const view = await this.getUnitView(unitId);
    const rules = view?.sections?.rules?.items || [];
    const requestedRef = normalizedRuleRef(ruleRef);
    const requestedOrdinal = Number.parseInt(/-(\d+)$/.exec(requestedRef)?.[1] || '', 10);
    const matchedRule = rules.find((rule) => normalizedRuleRef(rule.entityId || '') === requestedRef)
      || (Number.isFinite(requestedOrdinal) && requestedOrdinal > 0
        ? rules[requestedOrdinal - 1]
        : undefined);
    const statement = formatOfficialContent(matchedRule?.statement);
    if (!matchedRule || !statement) return null;
    return {
      ruleRef: matchedRule.entityId || ruleRef,
      title: formatOfficialContent(matchedRule.title) || 'Critério decisivo',
      statement,
    };
  }

  public async getQuestionPresentation(questionId: string): Promise<PBLQuestionPresentation | null> {
    const cached = this.questionPresentations.get(questionId);
    if (cached) return cached;

    let normalized = null;
    try {
      normalized = await fetchNormalizedQuestion(questionId);
    } catch {
      normalized = null;
    }
    if (normalized?.prompt && normalized.correctAnswer) {
      const presentation: PBLQuestionPresentation = {
        questionRef: questionId,
        questionType: normalized.options?.length ? 'multiple_choice' : 'true_false',
        supportText: formatOfficialContent(normalized.supportText) || undefined,
        presentation: normalized.presentation,
        prompt: formatOfficialContent(normalized.prompt),
        options: (normalized.options || []).map((option) => ({
          label: option.letter.toUpperCase(),
          text: formatOfficialContent(option.text),
        })),
        correctAnswer: normalized.correctAnswer,
        commentary: formatOfficialContent(normalized.commentary) || undefined,
        examBoard: normalized.bank,
        year: normalized.year,
      };
      this.questionPresentations.set(questionId, presentation);
      return presentation;
    }

    const link = this.questionLinksMap.get(questionId);
    if (!link?.unitId) return null;
    const view = await this.getUnitView(link.unitId);
    if (!view) return null;

    const question = view.officialQuestions?.find((candidate) =>
      candidate.officialQuestionId === questionId || candidate.questionId === questionId
    );
    if (!question) return null;

    const payload = (question.questionPayload || question) as Record<string, unknown>;
    const answerPayload = (question.answerPayload || {}) as Record<string, unknown>;
    const rawPrompt = formatOfficialContent(payload.prompt || payload.statement);
    const rawSupportText = formatOfficialContent(payload.support_text || payload.supportText);
    const prompt = (rawPrompt.length < 15 && rawSupportText)
      ? `${rawSupportText} ${rawPrompt}`
      : rawPrompt;
    const correctAnswer = String(answerPayload.answer || question.officialAnswer || '');
    if (!prompt || !correctAnswer) return null;
    const rawOptions = Array.isArray(payload.options)
      ? payload.options
      : Array.isArray(payload.alternatives)
        ? payload.alternatives
        : [];
    const presentation: PBLQuestionPresentation = {
      questionRef: questionId,
      questionType: rawOptions.length ? 'multiple_choice' : 'true_false',
      supportText: rawSupportText || undefined,
      prompt,
      options: rawOptions.map((option, index) => {
        const item = option as Record<string, unknown>;
        return {
          label: String(item.label || item.letter || String.fromCharCode(65 + index)).toUpperCase(),
          text: formatOfficialContent(item.text),
        };
      }),
      correctAnswer,
      commentary: formatOfficialContent(answerPayload.commentary || question.explanation) || undefined,
      examBoard: String(payload.exam_board || question.examBoard || '') || undefined,
      organization: String(payload.organization || question.organization || '') || undefined,
      year: typeof payload.year === 'number' ? payload.year : typeof question.year === 'number' ? question.year : undefined,
    };
    this.questionPresentations.set(questionId, presentation);
    return presentation;
  }

  public async getDiagnosticPath(id: string): Promise<PBLDiagnosticPath | null> {
    return this.diagnosticPaths.get(id) || null;
  }

  public async getDiagnosticPathForCompetency(competencyId: string): Promise<PBLDiagnosticPath | null> {
    return this.diagnosticByCompetency.get(competencyId) || null;
  }

  public async getTransferSet(id: string): Promise<PBLTransferSet | null> {
    return this.transferSets.get(id) || null;
  }

  public async getTransferSetForCompetency(competencyId: string): Promise<PBLTransferSet | null> {
    return this.transferByCompetency.get(competencyId) || null;
  }

  public async getCumulativeSessions(): Promise<PBLCumulativeSession[]> {
    return Array.from(this.cumulativeSessions.values()).sort(
      (a, b) => a.spiralProgressionLevel - b.spiralProgressionLevel
    );
  }

  public async getCumulativeSession(sessionId: string): Promise<PBLCumulativeSession | null> {
    return this.cumulativeSessions.get(sessionId) || null;
  }

  public async getManifest(): Promise<PBLManifest | null> {
    return this.manifest;
  }
}

// Global Singleton for application runtime
export const pblRepository = new PBLRepository();
