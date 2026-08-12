import { useCallback, useEffect, useRef, useState } from 'react';
import { BookMarked, ChevronLeft, ChevronRight, ExternalLink, Loader2, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import {
  fetchOfficialQuestion,
  fetchOfficialQuestionSample,
  fetchOfficialQuestions,
  officialDetailToQuizQuestion,
  type OfficialQuestionDetail,
  type OfficialQuestionFilters,
  type OfficialQuestionIndexItem,
} from '../lib/officialQuestions';
import type { QuizQuestion } from '../types/suveca';
import { formatOfficialContent } from '../lib/officialContent';
import { useModalFocus } from '../hooks/useModalFocus';

const PAGE_SIZE = 12;
const moduleOptions = [
  ['mod1', 'Módulo 1 — Interpretação'],
  ['mod2', 'Módulo 2 — Semântica e coesão'],
  ['mod3', 'Módulo 3 — Ortografia'],
  ['mod4', 'Módulo 4 — Morfologia'],
  ['mod5', 'Módulo 5 — Pronomes'],
  ['mod6', 'Módulo 6 — Verbos'],
  ['mod7', 'Módulo 7 — Sintaxe da oração'],
  ['mod8', 'Módulo 8 — Termos da oração'],
  ['mod9', 'Módulo 9 — Concordância'],
  ['mod10', 'Módulo 10 — Regência e crase'],
  ['mod11', 'Módulo 11 — Período composto'],
  ['mod12', 'Módulo 12 — Pontuação'],
  ['mod13', 'Módulo 13 — Colocação, se e que'],
  ['mod14', 'Módulo 14 — Reescrita'],
  ['mod16', 'Módulo 16 — Textualidade e referenciação'],
  ['mod17', 'Módulo 17 — Discurso e modalização'],
  ['mod18', 'Módulo 18 — Argumentação'],
  ['apendice-d', 'Apêndice D — Discursiva'],
] as const;

interface OfficialQuestionsExplorerProps {
  onStartSimulado?: (questions: QuizQuestion[]) => void;
}

export function OfficialQuestionsExplorer({ onStartSimulado }: OfficialQuestionsExplorerProps) {
  const [filters, setFilters] = useState<OfficialQuestionFilters>({});
  const [draftQuery, setDraftQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<OfficialQuestionIndexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [buildId, setBuildId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<OfficialQuestionDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isBuildingSample, setIsBuildingSample] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isDetailOpen = Boolean(detail || isLoadingDetail);
  const closeDetail = useCallback(() => {
    setDetail(null);
    setIsLoadingDetail(false);
  }, []);
  const detailDialogRef = useModalFocus(isDetailOpen, closeDetail, closeButtonRef);

  useEffect(() => {
    if (detail) closeButtonRef.current?.focus();
  }, [detail]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await fetchOfficialQuestions(filters, { offset, limit: PAGE_SIZE });
      setItems(result.items);
      setTotal(result.total);
      setBuildId(result.buildId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as questões.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { void load(); }, [load]);

  const updateFilter = (key: keyof OfficialQuestionFilters, value: string) => {
    setOffset(0);
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const openQuestion = async (questionId: string) => {
    setIsLoadingDetail(true);
    setError('');
    try {
      setDetail(await fetchOfficialQuestion(questionId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir a questão.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const startOfficialSimulado = async () => {
    if (!onStartSimulado) return;
    setIsBuildingSample(true);
    setError('');
    try {
      const sample = await fetchOfficialQuestionSample(filters, 10);
      onStartSimulado(sample.questions.map(officialDetailToQuizQuestion));
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : 'Não foi possível montar o simulado oficial.');
    } finally {
      setIsBuildingSample(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5" aria-labelledby="official-questions-title">
      <header className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-xs sm:p-7">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-teal-700 p-2.5 text-white"><BookMarked className="h-5 w-5" /></span>
          <div>
            <h1 id="official-questions-title" className="text-xl font-extrabold text-slate-950 sm:text-2xl">Banco de questões oficiais</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {buildId ? `${total} questões oficiais disponíveis. ` : 'Corpus editorial esperado: 372 questões. '}
              Tópicos, alternativas, gabaritos, soluções, estatísticas e metadados permanecem oficiais; os vínculos com módulos são uma camada derivada SuVeCA.
            </p>
            {buildId && <p className="mt-2 font-mono text-[11px] text-teal-800">KB build {buildId}</p>}
            {onStartSimulado && <button type="button" onClick={() => void startOfficialSimulado()} disabled={isBuildingSample || total === 0} className="button-primary mt-4 min-h-[44px] disabled:opacity-50">{isBuildingSample ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />} Simulado oficial com 10 questões filtradas</button>}
          </div>
        </div>
      </header>

      <form
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => { event.preventDefault(); updateFilter('query', draftQuery); }}
      >
        <label className="relative sm:col-span-2 lg:col-span-2">
          <span className="sr-only">Buscar no conteúdo oficial</span>
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} className="input-field min-h-[44px] w-full pl-9" placeholder="Buscar no enunciado, solução ou tópico" />
        </label>
        <select aria-label="Filtrar por módulo" className="input-field min-h-[44px]" value={filters.moduleId || ''} onChange={(event) => updateFilter('moduleId', event.target.value)}>
          <option value="">Todos os módulos</option>
          {moduleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input aria-label="Filtrar por tópico oficial" className="input-field min-h-[44px]" value={filters.topic || ''} onChange={(event) => updateFilter('topic', event.target.value)} placeholder="Tópico oficial" />
        <input aria-label="Filtrar por banca" className="input-field min-h-[44px]" value={filters.bank || ''} onChange={(event) => updateFilter('bank', event.target.value)} placeholder="Banca (ex.: FGV)" />
        <input aria-label="Filtrar por ano" className="input-field min-h-[44px]" inputMode="numeric" value={filters.year || ''} onChange={(event) => updateFilter('year', event.target.value)} placeholder="Ano" />
        <div className="flex gap-2">
          <select aria-label="Filtrar por dificuldade" className="input-field min-h-[44px] min-w-0 flex-1" value={filters.difficulty || ''} onChange={(event) => updateFilter('difficulty', event.target.value)}>
            <option value="">Dificuldade</option><option value="EASY">Fácil</option><option value="MEDIUM">Média</option>
          </select>
          <button type="submit" className="button-primary min-h-[44px] min-w-[44px] px-3" aria-label="Aplicar busca"><Search className="h-4 w-4" /></button>
        </div>
      </form>

      {!isLoading && !error && <div className="flex items-center justify-between text-sm text-slate-600" aria-live="polite">
        <span><strong className="text-slate-900">{total}</strong> questões encontradas</span>
        <span>Exibindo {total ? offset + 1 : 0}–{Math.min(offset + PAGE_SIZE, total)}</span>
      </div>}

      {error && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
        <span>{error}</span>
        <button type="button" onClick={() => void load()} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 font-bold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>}
      {isLoading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando corpus oficial…</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.questionId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-bold text-teal-800">Questão oficial</p><h2 className="mt-1 font-bold text-slate-900">{item.officialProjection.topicNames[0] || 'Língua Portuguesa'}</h2></div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{item.officialProjection.difficulty === 'EASY' ? 'FÁCIL' : 'MÉDIA'}</span>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-slate-600">{item.officialProjection.banks.join(', ') || 'Banca não identificada'} · {item.officialProjection.years.join(', ')}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{item.suvecaDerived.moduleIds.map((moduleId) => <span key={moduleId} className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-800">{moduleId}</span>)}</div>
              <button type="button" onClick={() => void openQuestion(item.questionId)} className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-sm font-bold text-teal-800 hover:bg-teal-100"><ExternalLink className="h-4 w-4" /> Abrir questão completa</button>
            </article>
          ))}
        </div>
      )}

      <nav className="flex justify-center gap-3" aria-label="Paginação das questões">
        <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="button-secondary min-h-[44px] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button>
        <button type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="button-secondary min-h-[44px] disabled:opacity-40">Próxima <ChevronRight className="h-4 w-4" /></button>
      </nav>

      {isDetailOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div ref={detailDialogRef} tabIndex={-1} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:rounded-2xl sm:p-7" role="dialog" aria-modal="true" aria-label="Questão oficial completa">
            {isLoadingDetail || !detail ? <div role="status" className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div> : (() => {
              const raw = detail.official.raw as { statement?: string; statement_text?: string; alternatives?: Array<Record<string, unknown>>; solution?: Record<string, unknown>; has_video_solution?: boolean; solution_video_url?: string };
              const solution = raw.solution || {};
              return <>
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-teal-800">Questão oficial</p><p className="mt-1 flex items-center gap-1 text-xs text-slate-700"><ShieldCheck className="h-3.5 w-3.5" /> Conteúdo oficial preservado</p></div><button ref={closeButtonRef} type="button" onClick={closeDetail} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-slate-100" aria-label="Fechar questão"><X className="h-5 w-5" /></button></div>
                <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-800">{formatOfficialContent(raw.statement || raw.statement_text)}</p>
                <ol className="mt-5 space-y-2">{(raw.alternatives || []).map((alternative, index) => <li key={String(alternative.id || index)} className={`rounded-xl border p-3 text-sm leading-6 ${alternative.correct ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'}`}><strong>{String.fromCharCode(65 + index)}.</strong> {formatOfficialContent(alternative.body || alternative.sanitized_body)}</li>)}</ol>
                <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><h3 className="font-bold text-amber-950">Solução oficial</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-amber-950">{formatOfficialContent(solution.complete_html || solution.complete || solution.sanitized_complete) || 'Esta questão não possui solução textual no corpus.'}</p></div>
                {raw.has_video_solution && raw.solution_video_url && <a href={raw.solution_video_url} target="_blank" rel="noreferrer" className="button-secondary mt-4 min-h-[44px]">Abrir solução em vídeo <ExternalLink className="h-4 w-4" /></a>}
              </>;
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
