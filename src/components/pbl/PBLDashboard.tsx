import React, { useEffect, useMemo, useState } from 'react';
import type { CadernoErroItem } from '../../types/suveca';
import type {
  PBLAttemptTelemetryPayload,
  PBLCompetency,
  PBLCumulativeSession,
  CompetencyMastery,
  PBLSession,
  PBLSessionMode,
} from '../../types/pbl';
import { pblRepository } from '../../lib/pbl/data/PBLRepository';
import { pblEngine } from '../../lib/pbl/engine/PBLEngine';
import { PBLSessionRepository } from '../../lib/pbl/persistence/PBLSessionRepository';
import { PBLSessionView } from './PBLSessionView';
import { ArrowRight, Brain, CalendarClock, ChevronLeft, ChevronRight, Clock3, Play, RotateCw, Search, Sparkles } from 'lucide-react';
import { formatLessonRange, getLessonName, getLessonSearchLabel } from '../../data/lessonCatalog';
import { presentCompetencyTitle, stripContextualPrefix } from '../../lib/learnerFacingLabels';

interface PBLDashboardProps {
  userId?: string;
  onAddErrorToNotebook?: (conteudo: string, erroCometido: string, regraDecisiva: string, metadata?: Partial<CadernoErroItem>) => void;
  onRecordAttempt?: (attempt: PBLAttemptTelemetryPayload) => void;
  onCompleteSession?: () => void;
  onOpenNotebook?: () => void;
}

const PAGE_SIZE = 12;

export const PBLDashboard: React.FC<PBLDashboardProps> = ({
  userId = 'guest',
  onAddErrorToNotebook,
  onRecordAttempt,
  onCompleteSession,
  onOpenNotebook,
}) => {
  const [competencies, setCompetencies] = useState<PBLCompetency[]>([]);
  const [cumulativeSessions, setCumulativeSessions] = useState<PBLCumulativeSession[]>([]);
  const [userMastery, setUserMastery] = useState<Record<string, CompetencyMastery>>({});
  const [activeSession, setActiveSession] = useState<PBLSession | null>(null);
  const [resumableSession, setResumableSession] = useState<PBLSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLesson, setSelectedLesson] = useState('ALL');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showAllCumulative, setShowAllCumulative] = useState(false);
  const [unavailableCompetencyIds, setUnavailableCompetencyIds] = useState<Set<string>>(new Set());

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      if (!pblRepository.isReady()) await pblRepository.init();
      const [comps, cumulative, mastery, active] = await Promise.all([
        pblRepository.getAllCompetencies(),
        pblRepository.getCumulativeSessions(),
        PBLSessionRepository.getUserMastery(userId),
        PBLSessionRepository.getLatestActiveSession(userId),
      ]);
      setCompetencies(comps);
      setUnavailableCompetencyIds(new Set(
        comps
          .filter((competency) => competency.practiceCoverage?.status !== 'ready')
          .map((competency) => competency.competencyId)
      ));
      setCumulativeSessions(cumulative);
      setUserMastery(mastery);
      setResumableSession(active);
    } catch (error) {
      console.error('[PBLDashboard] Error loading data:', error);
      setErrorMessage('Não foi possível carregar o Painel PBL. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadDashboardData(); }, [userId]);
  useEffect(() => { setPage(1); }, [selectedLesson, query]);

  const handleStartSession = async ({
    mode,
    targetLessonId,
    targetCompetencyId,
    cumulativeSessionId,
  }: {
    mode: PBLSessionMode;
    targetLessonId?: string;
    targetCompetencyId?: string;
    cumulativeSessionId?: string;
  }) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const session = await pblEngine.startSession({
        userId,
        mode,
        targetLessonId,
        targetCompetencyId,
        cumulativeSessionId,
        currentMasteryMap: userMastery,
        maxCompetencies: mode === 'cumulative' ? 2 : 1,
      });
      await PBLSessionRepository.saveSession(session);
      setActiveSession(session);
    } catch (error) {
      console.error('[PBLDashboard] Error starting session:', error);
      setErrorMessage(error instanceof Error
        ? error.message
        : 'Não foi possível iniciar a sessão. Nenhum progresso foi perdido.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompetencies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return competencies.filter((competency) =>
      (selectedLesson === 'ALL' || competency.lessonId === selectedLesson) &&
      (!normalizedQuery || `${competency.title} ${competency.description} ${getLessonSearchLabel(competency.lessonId)}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
    );
  }, [competencies, query, selectedLesson]);
  const totalPages = Math.max(1, Math.ceil(filteredCompetencies.length / PAGE_SIZE));
  const visibleCompetencies = filteredCompetencies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const dueCompetencies = useMemo(() => {
    const now = Date.now();
    const competencyById = new Map(competencies.map((competency) => [competency.competencyId, competency]));
    return Object.values(userMastery)
      .filter((mastery) => mastery.totalAttempts > 0)
      .filter((mastery) => {
        const dueAt = Date.parse(mastery.nextReviewRecommendedAt || '');
        return Number.isFinite(dueAt) && dueAt <= now;
      })
      .filter((mastery) => competencyById.get(mastery.competencyId)?.practiceCoverage?.status === 'ready')
      .sort((left, right) =>
        Date.parse(left.nextReviewRecommendedAt) - Date.parse(right.nextReviewRecommendedAt)
        || left.score - right.score
      );
  }, [competencies, userMastery]);
  const scheduledReviews = useMemo(() => {
    const competencyById = new Map(competencies.map((competency) => [competency.competencyId, competency]));
    return Object.values(userMastery)
      .filter((mastery) => mastery.totalAttempts > 0 && competencyById.has(mastery.competencyId))
      .filter((mastery) => Number.isFinite(Date.parse(mastery.nextReviewRecommendedAt || '')))
      .sort((left, right) => Date.parse(left.nextReviewRecommendedAt) - Date.parse(right.nextReviewRecommendedAt))
      .slice(0, 5)
      .map((mastery) => ({ mastery, competency: competencyById.get(mastery.competencyId)! }));
  }, [competencies, userMastery]);
  const formatReviewDate = (value: string): string => new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value));

  if (activeSession) {
    return (
      <PBLSessionView
        initialSession={activeSession}
        onExit={() => { setActiveSession(null); void loadDashboardData(); }}
        onAddErrorToNotebook={onAddErrorToNotebook}
        onRecordAttempt={onRecordAttempt}
        onCompleteSession={onCompleteSession}
        onOpenNotebook={onOpenNotebook}
        onOpenReview={() => { setActiveSession(null); void loadDashboardData(); }}
      />
    );
  }

  if (loading && !competencies.length) {
    return <div role="status" className="tool-content-shell p-8 text-center text-sm font-semibold text-slate-700">Carregando trilhas PBL…</div>;
  }

  return (
    <div className="pbl-dashboard tool-content-shell space-y-8">
      {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">{errorMessage}</div>}

      {resumableSession && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div><h2 className="text-sm font-bold text-amber-950">Você tem uma sessão pausada</h2><p className="mt-1 text-xs text-amber-900">Retome da etapa {resumableSession.phase === 'problem' ? 'caso inicial' : 'em que parou'}, sem perder tentativas.</p></div>
          <button type="button" onClick={() => setActiveSession(resumableSession)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-extrabold text-amber-950"><RotateCw className="h-4 w-4" /> Continuar sessão</button>
        </div>
      )}

      <div className="tool-page-hero relative overflow-hidden rounded-3xl border border-indigo-100 bg-linear-to-r from-indigo-900 via-indigo-800 to-indigo-950 p-8 text-white shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-100"><Sparkles className="h-3.5 w-3.5 text-amber-300" /> Aprendizagem Baseada em Problemas</span>
          <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Aprenda Português resolvendo problemas reais</h1>
          <p className="mt-2 text-sm leading-relaxed text-indigo-100">Sessões curtas com uma competência, diagnóstico, intervenção e transferência. O tempo real inclui leitura, microestudo e reflexão e é medido durante a sessão.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={loading} onClick={() => handleStartSession({ mode: 'guided' })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-400 px-6 text-xs font-extrabold text-indigo-950 shadow-md hover:bg-amber-300 disabled:opacity-50"><Play className="h-4 w-4 fill-indigo-950" /> Iniciar sessão recomendada</button>
            <button type="button" disabled={loading} onClick={() => handleStartSession({ mode: 'diagnostic' })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-5 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50"><Brain className="h-4 w-4" /> Diagnóstico de competência ainda não praticada</button>
            {dueCompetencies[0] && (
              <button type="button" disabled={loading} onClick={() => handleStartSession({ mode: 'review', targetCompetencyId: dueCompetencies[0].competencyId })} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-300/70 bg-amber-300/15 px-5 text-xs font-bold text-amber-100 hover:bg-amber-300/25 disabled:opacity-50"><CalendarClock className="h-4 w-4" /> Revisar agora · {dueCompetencies.length} vencida{dueCompetencies.length === 1 ? '' : 's'}</button>
            )}
          </div>
        </div>
      </div>

      {scheduledReviews.length > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 shadow-sm" aria-labelledby="pbl-review-queue-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="pbl-review-queue-title" className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-950"><CalendarClock className="h-4 w-4" /> Fila de recuperação espaçada</h2>
              <p className="mt-1 text-xs text-indigo-900">Retenção só é confirmada após uma recuperação futura, sem apoio.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-800">{dueCompetencies.length} vencida{dueCompetencies.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scheduledReviews.map(({ mastery, competency }) => {
              const due = Date.parse(mastery.nextReviewRecommendedAt) <= Date.now();
              const title = presentCompetencyTitle(competency.title).title;
              return (
                <article key={mastery.competencyId} className="rounded-xl border border-indigo-100 bg-white p-4">
                  <p className="text-xs font-bold text-slate-950">{title}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${due ? 'text-rose-700' : 'text-slate-600'}`}>{due ? 'Revisão vencida' : `Agendada para ${formatReviewDate(mastery.nextReviewRecommendedAt)}`}</p>
                  <button type="button" disabled={loading || !due} onClick={() => handleStartSession({ mode: 'review', targetCompetencyId: mastery.competencyId })} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600"><RotateCw className="h-3.5 w-3.5" /> {due ? 'Recuperar sem apoio' : 'Aguardar intervalo'}</button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="cumulative-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 id="cumulative-title" className="text-sm font-bold uppercase tracking-wider text-slate-800">Revisões espirais cumulativas</h2><p className="text-xs text-slate-600">Duas competências intercaladas; a duração varia conforme a necessidade de apoio.</p></div>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">{cumulativeSessions.length} sessões</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(showAllCumulative ? cumulativeSessions : cumulativeSessions.slice(0, 6)).map((item) => (
            <article key={item.sessionId} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div><div className="text-xs font-bold text-indigo-900">{stripContextualPrefix(item.title, /^Revisão Cumulativa:\s*/i)}</div><p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{item.sessionGoal.replace(/(?:temas|conteúdos)\s+de\s+(A\d{2})\s+até\s+(A\d{2})/gi, (_match, start, end) => `conteúdos de ${formatLessonRange(start, end)}`)}</p></div>
              <button type="button" disabled={loading} onClick={() => handleStartSession({ mode: 'cumulative', cumulativeSessionId: item.sessionId })} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">Praticar revisão <ArrowRight className="h-3 w-3" /></button>
            </article>
          ))}
        </div>
        {cumulativeSessions.length > 6 && <button type="button" onClick={() => setShowAllCumulative((value) => !value)} className="mt-4 min-h-11 text-xs font-bold text-indigo-700">{showAllCumulative ? 'Mostrar menos' : `Ver as ${cumulativeSessions.length} revisões`}</button>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="competency-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 id="competency-title" className="text-sm font-bold uppercase tracking-wider text-slate-800">Escolher uma competência</h2><p className="text-xs text-slate-600">Mostrando {visibleCompetencies.length} de {filteredCompetencies.length}; o mapa completo permanece disponível por filtro.</p></div>
          <div className="flex flex-wrap gap-2">
            <label className="relative"><span className="sr-only">Buscar competência</span><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tema" className="rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800" /></label>
            <select value={selectedLesson} aria-label="Filtrar competências por tema curricular" onChange={(event) => setSelectedLesson(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800">
              <option value="ALL">Todos os temas curriculares</option>
              {Array.from(new Set(competencies.map((item) => item.lessonId))).sort().map((lesson) => <option key={lesson} value={lesson}>{getLessonName(lesson)}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCompetencies.map((competency) => {
            const mastery = userMastery[competency.competencyId];
            const score = mastery ? Math.round(mastery.score * 100) : 0;
            const evidenceState = mastery?.learningState === 'retention_confirmed'
              ? 'Retenção confirmada'
              : mastery?.learningState === 'immediate_transfer_confirmed'
                ? 'Transferência imediata confirmada'
                : mastery?.learningState === 'needs_review'
                  ? 'Revisão necessária'
                  : 'Em aquisição';
            const unavailable = unavailableCompetencyIds.has(competency.competencyId);
            const coverage = competency.practiceCoverage;
            const presentation = presentCompetencyTitle(competency.title);
            return (
              <article key={competency.competencyId} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div>
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">{getLessonName(competency.lessonId)}</span>
                  <h3 className="mt-2 text-sm font-extrabold leading-snug text-slate-950">{presentation.title}</h3>
                  <span className="mt-1 inline-flex rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-800">{presentation.kind}</span>
                  {coverage && <span className={`ml-1 mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${coverage.status === 'ready' && coverage.strength !== 'minimum' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : coverage.status === 'blocked' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{coverage.distinctQuestions} questões distintas · {coverage.strength === 'minimum' ? 'rotação mínima' : coverage.strength === 'adequate' ? 'rotação adequada' : 'rotação robusta'}</span>}
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-slate-600">{competency.description}</p>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3"><div className="flex justify-between text-[11px] text-slate-600"><span>{evidenceState}</span><strong className="text-indigo-700">{score}%</strong></div><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${score}%` }} /></div><button type="button" disabled={loading || unavailable} onClick={() => handleStartSession({ mode: 'guided', targetCompetencyId: competency.competencyId })} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"><Clock3 className="h-3.5 w-3.5" /> {unavailable ? (coverage?.reason || 'Cobertura insuficiente para esta prática') : 'Iniciar prática'}</button></div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-slate-700 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button>
          <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-xs font-bold text-slate-700 disabled:opacity-40">Próxima <ChevronRight className="h-4 w-4" /></button>
        </div>
      </section>
    </div>
  );
};
