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

  public isReady(): boolean {
    return this.initialized;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // 1. Fetch competencies
      const compsRes = await fetch(`${this.basePath}/pbl_competency_map.json`);
      if (compsRes.ok) {
        const compsData: PBLCompetency[] = await compsRes.json();
        compsData.forEach((c) => this.competencies.set(c.competencyId, c));
      }

      // 2. Fetch cases
      const casesRes = await fetch(`${this.basePath}/pbl_cases.json`);
      if (casesRes.ok) {
        const casesData: PBLCase[] = await casesRes.json();
        casesData.forEach((cs) => {
          this.cases.set(cs.caseId, cs);
          this.caseByCompetency.set(cs.competencyRef, cs);
        });
      }

      // 3. Fetch transfer sets
      const xfersRes = await fetch(`${this.basePath}/pbl_transfer_sets.json`);
      if (xfersRes.ok) {
        const xfersData: PBLTransferSet[] = await xfersRes.json();
        xfersData.forEach((x) => {
          this.transferSets.set(x.transferSetId, x);
          this.transferByCompetency.set(x.competencyRef, x);
        });
      }

      // 4. Fetch diagnostic paths
      const diagsRes = await fetch(`${this.basePath}/pbl_diagnostic_paths.json`);
      if (diagsRes.ok) {
        const diagsData: PBLDiagnosticPath[] = await diagsRes.json();
        diagsData.forEach((d) => {
          this.diagnosticPaths.set(d.pathId, d);
          this.diagnosticByCompetency.set(d.competencyRef, d);
        });
      }

      // 5. Fetch cumulative review sessions
      const sessRes = await fetch(`${this.basePath}/pbl_cumulative_review_sessions.json`);
      if (sessRes.ok) {
        const sessData: PBLCumulativeSession[] = await sessRes.json();
        sessData.forEach((s) => this.cumulativeSessions.set(s.sessionId, s));
      }

      // 6. Fetch Question Links
      const qclRes = await fetch(`${this.basePath}/question_competency_links.json`);
      if (qclRes.ok) {
        const qclData: Record<string, QuestionCompetencyLink> = await qclRes.json();
        Object.entries(qclData).forEach(([qid, link]) => this.questionLinksMap.set(qid, link));
      }

      // 7. Fetch Question Pedagogy Index
      const qpRes = await fetch(`${this.basePath}/question_pedagogy_index.json`);
      if (qpRes.ok) {
        const qpData: Record<string, QuestionPedagogy> = await qpRes.json();
        Object.entries(qpData).forEach(([qid, qp]) => this.questionPedagogyMap.set(qid, qp));
      }

      // 8. Fetch Manifest
      const manRes = await fetch(`${this.basePath}/pbl_manifest.json`);
      if (manRes.ok) {
        this.manifest = await manRes.json();
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
      try {
        const response = await fetch(`/knowledge/pedagogical/views/${link.unitId}.json`);
        if (!response.ok) return null;
        view = await response.json();
      } catch {
        return null;
      }
      this.unitViewCache.set(link.unitId, view);
    }

    const question = view.officialQuestions?.find((candidate) =>
      candidate.officialQuestionId === questionId || candidate.questionId === questionId
    );
    if (!question) return null;

    const payload = (question.questionPayload || question) as Record<string, unknown>;
    const answerPayload = (question.answerPayload || {}) as Record<string, unknown>;
    const prompt = formatOfficialContent(payload.prompt);
    const correctAnswer = String(answerPayload.answer || question.officialAnswer || '');
    if (!prompt || !correctAnswer) return null;
    const rawOptions = Array.isArray(payload.options) ? payload.options : [];
    const presentation: PBLQuestionPresentation = {
      questionRef: questionId,
      questionType: rawOptions.length ? 'multiple_choice' : 'true_false',
      supportText: formatOfficialContent(payload.support_text || payload.supportText) || undefined,
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
