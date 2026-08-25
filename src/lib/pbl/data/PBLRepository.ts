import type {
  PBLCompetency,
  PBLCase,
  QuestionPedagogy,
  QuestionCompetencyLink,
  PBLDiagnosticPath,
  PBLTransferSet,
  PBLCumulativeSession,
  PBLManifest,
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

  getDiagnosticPath(id: string): Promise<PBLDiagnosticPath | null>;
  getDiagnosticPathForCompetency(competencyId: string): Promise<PBLDiagnosticPath | null>;

  getTransferSet(id: string): Promise<PBLTransferSet | null>;
  getTransferSetForCompetency(competencyId: string): Promise<PBLTransferSet | null>;

  getCumulativeSessions(): Promise<PBLCumulativeSession[]>;
  getCumulativeSession(sessionId: string): Promise<PBLCumulativeSession | null>;

  getManifest(): Promise<PBLManifest | null>;
}

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
  private unitViewCache: Map<string, unknown> = new Map();
  private manifest: PBLManifest | null = null;
  private initialized = false;

  constructor(private basePath: string = '/knowledge/pbl') {}

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

  public isReady(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Fetch competencies
      const compsData = await this.safeFetchJson<PBLCompetency[]>(`${this.basePath}/pbl_competency_map.json`);
      if (compsData && Array.isArray(compsData)) {
        compsData.forEach((c) => this.competencies.set(c.competencyId, c));
      }

      // 2. Fetch cases
      const casesData = await this.safeFetchJson<PBLCase[]>(`${this.basePath}/pbl_cases.json`);
      if (casesData && Array.isArray(casesData)) {
        casesData.forEach((cs) => {
          this.cases.set(cs.caseId, cs);
          this.caseByCompetency.set(cs.competencyRef, cs);
        });
      }

      // 3. Fetch transfer sets
      const xfersData = await this.safeFetchJson<PBLTransferSet[]>(`${this.basePath}/pbl_transfer_sets.json`);
      if (xfersData && Array.isArray(xfersData)) {
        xfersData.forEach((x) => {
          this.transferSets.set(x.transferSetId, x);
          this.transferByCompetency.set(x.competencyRef, x);
        });
      }

      // 4. Fetch diagnostic paths
      const diagsData = await this.safeFetchJson<PBLDiagnosticPath[]>(`${this.basePath}/pbl_diagnostic_paths.json`);
      if (diagsData && Array.isArray(diagsData)) {
        diagsData.forEach((d) => {
          this.diagnosticPaths.set(d.pathId, d);
          this.diagnosticByCompetency.set(d.competencyRef, d);
        });
      }

      // 5. Fetch cumulative review sessions
      const sessData = await this.safeFetchJson<PBLCumulativeSession[]>(`${this.basePath}/pbl_cumulative_review_sessions.json`);
      if (sessData && Array.isArray(sessData)) {
        sessData.forEach((s) => this.cumulativeSessions.set(s.sessionId, s));
      }

      // 6. Fetch Question Links
      const qclData = await this.safeFetchJson<Record<string, QuestionCompetencyLink>>(`${this.basePath}/question_competency_links.json`);
      if (qclData && typeof qclData === 'object') {
        Object.entries(qclData).forEach(([qid, link]) => this.questionLinksMap.set(qid, link));
      }

      // 7. Fetch Question Pedagogy Index
      const qpData = await this.safeFetchJson<Record<string, QuestionPedagogy>>(`${this.basePath}/question_pedagogy_index.json`);
      if (qpData && typeof qpData === 'object') {
        Object.entries(qpData).forEach(([qid, qp]) => this.questionPedagogyMap.set(qid, qp));
      }

      // 8. Fetch explicitly authored PBL question presentations. They live in
      // a separate file so they can never be mistaken for captured official
      // questions while still participating in the same semantic runtime.
      const authoredData = await this.safeFetchJson<Record<string, PBLQuestionPresentation>>(
        `${this.basePath}/pbl_authored_questions.json`
      );
      if (authoredData && typeof authoredData === 'object') {
        Object.entries(authoredData).forEach(([qid, presentation]) =>
          this.questionPresentations.set(qid, presentation)
        );
      }

      // 9. Fetch Manifest
      const manData = await this.safeFetchJson<PBLManifest>(`${this.basePath}/pbl_manifest.json`);
      if (manData) {
        this.manifest = manData;
      }

      // 10. Síntese de fallback para questionLinksMap a partir dos cases e competências
      if (this.questionLinksMap.size === 0 && this.cases.size > 0) {
        this.cases.forEach((cs) => {
          if (cs.anchorQuestionRef && cs.unitRef) {
            const lessonId = cs.unitRef.replace(/^IP-/, '').split('-')[0] || '';
            const reviewedAt = cs.editorialStatus?.reviewedAt || new Date(0).toISOString();
            this.questionLinksMap.set(cs.anchorQuestionRef, {
              schemaVersion: '3.0.0',
              linkId: `LINK-${cs.caseId}`,
              officialQuestionRef: cs.anchorQuestionRef,
              competencyId: cs.competencyRef,
              unitId: cs.unitRef,
              lessonId,
              prerequisiteRefs: cs.prerequisiteRefs || [],
              pblSuitabilityScores: {
                anchor: 1,
                diagnostic: 0.8,
                transfer: 0.8,
                validation: 0.8,
                primaryRole: 'anchor',
              },
              assignedPBLRole: 'anchor',
              diagnosticPotential: 1,
              semanticReview: {
                status: 'approved',
                reviewedAt,
                reason: 'Vínculo reconstruído a partir de um caso PBL editorial publicado.',
                evidenceRefs: [`CASE:${cs.caseId}`],
              },
              competencyAssignments: [{
                assignmentId: `${cs.anchorQuestionRef}::${cs.competencyRef}`,
                competencyId: cs.competencyRef,
                unitId: cs.unitRef,
                lessonId,
                relation: 'primary',
                semanticStatus: 'approved',
                allowedRoles: ['anchor'],
                roleScores: { anchor: 1, diagnostic: 0, transfer: 0, validation: 0 },
                evidenceRefs: [`CASE:${cs.caseId}`],
                reviewMethod: 'editorial',
                reviewedAt,
                reason: 'Âncora explicitamente vinculada pelo caso PBL editorial.',
              }],
            });
          }
        });
      }

      this.initialized = true;
    } catch (err) {
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
    let view = this.unitViewCache.get(link.unitId) as {
      officialQuestions?: Array<Record<string, unknown>>;
    } | undefined;
    if (!view) {
      const fetchedView = await this.safeFetchJson<{
        officialQuestions?: Array<Record<string, unknown>>;
      }>(`/knowledge/pedagogical/views/${link.unitId}.json`);
      if (!fetchedView) return null;
      view = fetchedView;
      this.unitViewCache.set(link.unitId, view);
    }

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
