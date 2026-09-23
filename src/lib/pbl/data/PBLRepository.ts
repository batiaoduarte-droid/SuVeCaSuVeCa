import { fetchPublishedJson, publishedUrl, type PublishedFile } from '../../publishedData';
import type { QuestionDelivery } from '../../../types/pedagogicalView';
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
  getAuthoredPackage?(competencyId: string): Promise<any | null>;
  prepareCompetencies?(ids: string[]): Promise<void>;

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
  conditions?: string[];
  exceptions?: string[];
  blocks?: any[];
  resolvedTable?: {
    id: string;
    title: string;
    columns: string[];
    rows: string[][];
  };
}

interface PedagogicalUnitView {
  questionDelivery?: QuestionDelivery;
  officialQuestions?: Array<Record<string, unknown>>;
  sections?: {
    rules?: {
      items?: Array<{
        entityId?: string;
        title?: string;
        statement?: string;
        conditions?: string[];
        exceptions?: string[];
        blocks?: any[];
      }>;
    };
  };
  tables?: Array<{
    id: string;
    title: string;
    columns: string[];
    rows: string[][];
  }>;
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
  private manifest: PBLManifest | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private runtimeManifest: (PBLRuntimeShardManifest & { deliveryVersion: number; catalog: Record<string, PublishedFile>; structures: Record<string, { parts: Array<PublishedFile & { count: number }>; byId: Record<string, number>; byCompetency: Record<string, number> }> }) | null = null;
  private packageIndex: { packages: Array<PublishedFile & { competencyRef: string }> } | null = null;

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
    this.manifest = null;
    this.initialized = false;
    this.runtimeManifest = null;
    this.packageIndex = null;
    this.authoredPackages.clear();
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

  public isReady(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initializeCatalog();
    try { await this.initPromise; } finally { this.initPromise = null; }
  }

  private async initializeCatalog(): Promise<void> {
    this.reset();
    try {
      const manifest = await this.fetchRequiredJson<PBLManifest>(`${this.basePath}/pbl_manifest.json`);
      const runtime = await this.fetchRequiredJson<NonNullable<PBLRepository['runtimeManifest']>>(`${this.basePath}/${manifest.runtimeProjection?.manifestFile || 'pbl_runtime_manifest.json'}`);
      if (runtime.kind !== 'suveca-pbl-runtime-shards' || runtime.schemaVersion !== '1.0.0' || runtime.deliveryVersion !== 1 || !runtime.structures || !runtime.catalog) throw new Error('Manifesto PBL incompatível.');
      for (const [name, dataset] of Object.entries(runtime.datasets)) {
        const expected = name === 'questionCompetencyLinks'
          ? manifest.totalRuntimeQuestionLinks ?? manifest.totalQuestionLinks
          : manifest.totalRuntimeQuestionPedagogy ?? manifest.totalQuestionPedagogy;
        if (dataset.totalRecords !== expected || !dataset.questionToShard || Object.keys(dataset.questionToShard).length !== expected) throw new Error('Índice de questões PBL incompleto.');
      }
      const [competencies, sessions] = await Promise.all([
        fetchPublishedJson<PBLCompetency[]>(`${this.basePath}/pbl_competency_map.json`, runtime.catalog['pbl_competency_map.json']),
        fetchPublishedJson<PBLCumulativeSession[]>(`${this.basePath}/pbl_cumulative_review_sessions.json`, runtime.catalog['pbl_cumulative_review_sessions.json']),
      ]);
      if (!Array.isArray(competencies) || competencies.length !== manifest.totalCompetencies || !Array.isArray(sessions) || sessions.length !== manifest.totalCumulativeSessions) throw new Error('Catálogo PBL incompleto.');
      competencies.forEach(c => this.competencies.set(c.competencyId, c));
      sessions.forEach(s => this.cumulativeSessions.set(s.sessionId, s));
      this.manifest = manifest; this.runtimeManifest = runtime; this.initialized = true;
    } catch (error) { this.reset(); throw error; }
  }

  private async ensureStructure(kind: 'cases' | 'transfers' | 'diagnostics' | 'authored', id?: string): Promise<any[]> {
    if (!this.initialized) await this.init();
    if (!this.runtimeManifest) return [];
    const index = this.runtimeManifest.structures[kind];
    if (!index) throw new Error('Índice de estruturas PBL ausente.');
    const part = id === undefined ? undefined : index.byId[id] ?? index.byCompetency[id];
    if (id !== undefined && part === undefined) return [];
    const parts = part === undefined ? index.parts : [index.parts[part]];
    return (await Promise.all(parts.map(async descriptor => {
      if (!descriptor) throw new Error('Fragmento PBL ausente no índice.');
      const data = await fetchPublishedJson<any[]>(publishedUrl(this.basePath, descriptor.file), descriptor);
      if (!Array.isArray(data) || data.length !== descriptor.count) throw new Error('Estrutura PBL incompleta.');
      const field = { cases: 'caseId', transfers: 'transferSetId', diagnostics: 'pathId', authored: '' }[kind];
      if (data.some(r => index.parts[index.byId[kind === 'authored' ? r[0] : r[field]]]?.file !== descriptor.file)) throw new Error('Identidade da estrutura PBL divergente.');
      return data;
    }))).flat();
  }

  private async questionRecord<T>(datasetName: 'questionCompetencyLinks' | 'questionPedagogy', questionId: string): Promise<T | null> {
    if (!this.initialized) await this.init();
    const dataset = this.runtimeManifest?.datasets[datasetName];
    if (!dataset) return null;
    const part = dataset.questionToShard?.[questionId];
    if (part === undefined) return null;
    const descriptor = dataset.shards.find(s => s.part === part);
    if (!descriptor) throw new Error('Índice PBL aponta para shard ausente.');
    const records = await fetchPublishedJson<Record<string, T>>(publishedUrl(this.basePath, descriptor.file), descriptor);
    const keys = Object.keys(records);
    if (keys.length !== descriptor.recordCount || keys[0] !== descriptor.firstQuestionRef || keys.at(-1) !== descriptor.lastQuestionRef || !records[questionId]) throw new Error('Identidade dos registros PBL divergente.');
    return records[questionId];
  }

  public async prepareCompetencies(ids: string[]): Promise<void> {
    await this.init();
    for (const id of ids) {
      if (!this.competencies.has(id)) throw new Error(`Competência PBL ausente: ${id}`);
      await Promise.all([this.getCaseForCompetency(id), this.getDiagnosticPathForCompetency(id), this.getTransferSetForCompetency(id), this.getAuthoredPackage(id)]);
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
    authoredPackages?: any[];
    manifest?: PBLManifest;
  }): void {
    if (data.competencies) data.competencies.forEach((c) => this.competencies.set(c.competencyId, c));
    if (data.authoredPackages) data.authoredPackages.forEach((pkg) => this.registerAuthoredPackage(pkg));
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
    if (!this.initialized) await this.init();
    return this.competencies.get(id) || null;
  }

  public async getAllCompetencies(): Promise<PBLCompetency[]> {
    if (!this.initialized) await this.init();
    return Array.from(this.competencies.values());
  }

  public async getCompetenciesForUnit(unitId: string): Promise<PBLCompetency[]> {
    if (!this.initialized) await this.init();
    return Array.from(this.competencies.values()).filter((c) => c.unitId === unitId);
  }

  public async getCompetenciesForLesson(lessonId: string): Promise<PBLCompetency[]> {
    if (!this.initialized) await this.init();
    return Array.from(this.competencies.values()).filter((c) => c.lessonId === lessonId);
  }

  public async getCase(id: string): Promise<PBLCase | null> {
    const records = await this.ensureStructure('cases', id);
    return records.find(r => r.caseId === id) || this.cases.get(id) || null;
  }

  public async getCaseForCompetency(competencyId: string): Promise<PBLCase | null> {
    const records = await this.ensureStructure('cases', competencyId);
    return records.find(r => r.competencyRef === competencyId) || this.caseByCompetency.get(competencyId) || null;
  }

  public async getAllCases(): Promise<PBLCase[]> {
    const records = await this.ensureStructure('cases');
    return this.runtimeManifest ? records : Array.from(this.cases.values());
  }

  public async getQuestionPedagogy(questionId: string): Promise<QuestionPedagogy | null> {
    return this.questionPedagogyMap.get(questionId) || this.questionRecord<QuestionPedagogy>('questionPedagogy', questionId);
  }

  public async getQuestionCompetencyLink(questionId: string): Promise<QuestionCompetencyLink | null> {
    return this.questionLinksMap.get(questionId) || this.questionRecord<QuestionCompetencyLink>('questionCompetencyLinks', questionId);
  }

  private async getUnitView(unitId: string): Promise<PedagogicalUnitView | null> {
    return fetchPublishedJson<PedagogicalUnitView>(`/knowledge/pedagogical/views/${unitId}.json`);
  }

  public authoredPackages = new Map<string, any>();

  public async getAuthoredPackage(competencyId: string): Promise<any | null> {
    if (!this.initialized) await this.init();
    if (this.authoredPackages.has(competencyId)) return this.authoredPackages.get(competencyId);
    if (!this.runtimeManifest) return null;
    this.packageIndex ||= await fetchPublishedJson(`${this.basePath}/pbl_authored_packages.json`);
    if (!Array.isArray(this.packageIndex?.packages)) throw new Error('Índice de pacotes autorais inválido.');
    const descriptor = this.packageIndex.packages.find(p => p.competencyRef === competencyId);
    if (!descriptor) return null;
    const pkg = await fetchPublishedJson<any>(publishedUrl(this.basePath, descriptor.file), descriptor);
    if (pkg.competencyRef !== competencyId) throw new Error('Pacote de outra competência.');
    return pkg;
  }

  public registerAuthoredPackage(pkg: any): void {
    if (pkg?.competencyRef) {
      this.authoredPackages.set(pkg.competencyRef, pkg);
    }
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

    let resolvedTable: { id: string; title: string; columns: string[]; rows: string[][] } | undefined = undefined;
    if (matchedRule.blocks?.length && view?.tables?.length) {
      const tableRefBlock = matchedRule.blocks.find((b: any) => b.type === 'table_ref');
      if (tableRefBlock?.tableId) {
        const foundTable = view.tables.find((t: any) => t.id === tableRefBlock.tableId);
        if (foundTable) {
          resolvedTable = foundTable;
        }
      }
    }
    if (!resolvedTable && matchedRule.blocks?.length) {
      const directTable = matchedRule.blocks.find((b: any) => b.type === 'table');
      if (directTable?.columns && directTable?.rows) {
        resolvedTable = {
          id: directTable.id || 'rule_table',
          title: directTable.title || 'Tabela da regra',
          columns: directTable.columns,
          rows: directTable.rows,
        };
      }
    }

    return {
      ruleRef: matchedRule.entityId || ruleRef,
      title: formatOfficialContent(matchedRule.title) || 'Critério decisivo',
      statement,
      conditions: matchedRule.conditions,
      exceptions: matchedRule.exceptions,
      blocks: matchedRule.blocks,
      resolvedTable,
    };
  }

  public async getQuestionPresentation(questionId: string): Promise<PBLQuestionPresentation | null> {
    const records = await this.ensureStructure('authored', questionId);
    const cached = records.find(r => r[0] === questionId)?.[1] || this.questionPresentations.get(questionId);
    if (cached) return cached;

    let normalized = null;
    try {
      normalized = await fetchNormalizedQuestion(questionId);
    } catch (error) {
      if (this.runtimeManifest) throw error;
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
      if (!this.runtimeManifest) this.questionPresentations.set(questionId, presentation);
      return presentation;
    }

    const link = await this.getQuestionCompetencyLink(questionId);
    if (!link?.unitId) return null;
    const view = await this.getUnitView(link.unitId);
    if (!view) return null;

    let questions = view.officialQuestions;
    if (view.questionDelivery) {
      const descriptors = [...view.questionDelivery.pages, ...(view.questionDelivery.excluded ? [view.questionDelivery.excluded] : [])];
      const descriptor = descriptors.find(d => d.refs.includes(questionId));
      if (descriptor) {
        const records = await fetchPublishedJson<Array<{question: Record<string, unknown>}>>(publishedUrl('/knowledge/pedagogical', descriptor.file), descriptor);
        questions = records.map(r => r.question);
      }
    }
    const question = questions?.find((candidate) =>
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
    if (!this.runtimeManifest) this.questionPresentations.set(questionId, presentation);
    return presentation;
  }

  public async getDiagnosticPath(id: string): Promise<PBLDiagnosticPath | null> {
    const records = await this.ensureStructure('diagnostics', id);
    return records.find(r => r.pathId === id) || this.diagnosticPaths.get(id) || null;
  }

  public async getDiagnosticPathForCompetency(competencyId: string): Promise<PBLDiagnosticPath | null> {
    const records = await this.ensureStructure('diagnostics', competencyId);
    return records.find(r => r.competencyRef === competencyId) || this.diagnosticByCompetency.get(competencyId) || null;
  }

  public async getTransferSet(id: string): Promise<PBLTransferSet | null> {
    const records = await this.ensureStructure('transfers', id);
    return records.find(r => r.transferSetId === id) || this.transferSets.get(id) || null;
  }

  public async getTransferSetForCompetency(competencyId: string): Promise<PBLTransferSet | null> {
    const records = await this.ensureStructure('transfers', competencyId);
    return records.find(r => r.competencyRef === competencyId) || this.transferByCompetency.get(competencyId) || null;
  }

  public async getCumulativeSessions(): Promise<PBLCumulativeSession[]> {
    if (!this.initialized) await this.init();
    return Array.from(this.cumulativeSessions.values()).sort(
      (a, b) => a.spiralProgressionLevel - b.spiralProgressionLevel
    );
  }

  public async getCumulativeSession(sessionId: string): Promise<PBLCumulativeSession | null> {
    if (!this.initialized) await this.init();
    return this.cumulativeSessions.get(sessionId) || null;
  }

  public async getManifest(): Promise<PBLManifest | null> {
    if (!this.initialized) await this.init();
    return this.manifest;
  }
}

// Global Singleton for application runtime
export const pblRepository = new PBLRepository();
