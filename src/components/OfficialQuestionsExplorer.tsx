import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
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
import { MODULES_DATA } from '../data/modulesData';
import { getLessonName } from '../data/lessonCatalog';
import { formatOfficialContent } from '../lib/officialContent';
import { useModalFocus } from '../hooks/useModalFocus';
import type { QuestionPresentation } from '../types/questionPresentation';
import { QuestionPresentationContent } from './QuestionPresentationContent';
import { InlineRichText } from './pedagogical/blocks/InlineRichText';
import {
  GoldenRuleCard,
  StudyBadge,
  StudySurface,
} from './study-visuals';
import { QuestionCommentaryRenderer } from './ui/QuestionCommentaryRenderer';

const PAGE_SIZE = 12;

interface EditorialNormalizedQuestion {
  primaryLessonId?: string;
  questionType?: 'CERTO_ERRADO' | 'MULTIPLA_ESCOLHA';
  supportText?: string;
  presentation?: QuestionPresentation;
  prompt?: string;
  options?: Array<{ letter?: string; label?: string; text?: string }>;
  correctAnswer?: string;
  commentary?: string;
  bank?: string | null;
  organization?: string | null;
  year?: number | null;
  sourceLabel?: string | null;
}

interface OfficialQuestionsExplorerProps {
  onStartSimulado?: (questions: QuizQuestion[], filters: OfficialQuestionFilters) => void;
  initialFilters?: OfficialQuestionFilters;
  initialQuestionId?: string | null;
  onNavigationStateChange?: (state: {
    filters: OfficialQuestionFilters;
    questionId: string | null;
  }) => void;
}

const answerLabel = (answer?: string) => {
  const normalized = String(answer || '').trim().toUpperCase();
  if (normalized === 'C' || normalized === 'CERTO' || normalized === 'CORRETO') return 'Certo';
  if (normalized === 'E' || normalized === 'ERRADO' || normalized === 'INCORRETO') return 'Errado';
  return normalized;
};

const learnerTopicName = (topics: string[]) =>
  topics.find((topic) => !/^aula\s*\d+/i.test(topic.trim())) || topics[0] || 'Língua Portuguesa';

export function OfficialQuestionsExplorer({
  onStartSimulado,
  initialFilters = {},
  initialQuestionId = null,
  onNavigationStateChange,
}: OfficialQuestionsExplorerProps) {
  const moduleOptions = useMemo(
    () =>
      MODULES_DATA.filter((module) => /^mod\d+$/.test(module.id)).map((module) => ({
        value: module.id,
        label: getLessonName(module.id, 'full'),
      })),
    []
  );
  const [filters, setFilters] = useState<OfficialQuestionFilters>(initialFilters);
  const [draftQuery, setDraftQuery] = useState(String(initialFilters.query || ''));
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<OfficialQuestionIndexItem[]>([]);
  const [total, setTotal] = useState(0);
  const [buildId, setBuildId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<OfficialQuestionDetail | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(initialQuestionId);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isBuildingSample, setIsBuildingSample] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [detailAnswer, setDetailAnswer] = useState('');
  const [isDetailRevealed, setIsDetailRevealed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isDetailOpen = Boolean(detail || isLoadingDetail);
  const closeDetail = useCallback(() => {
    setDetail(null);
    setActiveQuestionId(null);
    setIsLoadingDetail(false);
    setDetailAnswer('');
    setIsDetailRevealed(false);
  }, []);
  const detailDialogRef = useModalFocus(isDetailOpen, closeDetail, closeButtonRef);
  const requestedQuestionRef = useRef<string | null>(null);

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
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as questões editoriais.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateFilter = (key: keyof OfficialQuestionFilters, value: string) => {
    setOffset(0);
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const activeFilterCount = [filters.moduleId, filters.topic, filters.bank, filters.year]
    .filter(Boolean).length;

  const openQuestion = async (questionId: string) => {
    setActiveQuestionId(questionId);
    setIsLoadingDetail(true);
    setError('');
    setDetailAnswer('');
    setIsDetailRevealed(false);
    try {
      setDetail(await fetchOfficialQuestion(questionId));
    } catch (loadError) {
      setActiveQuestionId(null);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível abrir a questão editorial.');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!initialQuestionId) {
      requestedQuestionRef.current = null;
      return;
    }
    if (requestedQuestionRef.current === initialQuestionId) return;
    requestedQuestionRef.current = initialQuestionId;
    void openQuestion(initialQuestionId);
  }, [initialQuestionId]);

  useEffect(() => {
    onNavigationStateChange?.({ filters, questionId: activeQuestionId });
  }, [activeQuestionId, filters, onNavigationStateChange]);

  const startEditorialSimulado = async () => {
    if (!onStartSimulado) return;
    setIsBuildingSample(true);
    setError('');
    try {
      const sample = await fetchOfficialQuestionSample(filters, 10);
      onStartSimulado(sample.questions.map(officialDetailToQuizQuestion), filters);
    } catch (sampleError) {
      setError(sampleError instanceof Error ? sampleError.message : 'Não foi possível montar a prática editorial.');
    } finally {
      setIsBuildingSample(false);
    }
  };

  return (
    <section className="tool-content-shell space-y-5" aria-labelledby="editorial-questions-title">
      <header className="tool-page-header rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-xs sm:p-7">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-teal-700 p-2.5 text-white"><BookMarked className="h-5 w-5" /></span>
          <div>
            <h1 id="editorial-questions-title" className="text-xl font-extrabold text-slate-950 sm:text-2xl">
              Banco de questões editoriais
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {buildId ? `${total} questões disponíveis nos filtros atuais. ` : 'Carregando o banco editorial da apostila. '}
              Enunciados, alternativas, gabaritos e comentários vêm do percurso curricular; a revisão geral organiza a retomada cumulativa.
            </p>
            {buildId && <p className="mt-2 font-mono text-[11px] text-teal-800">Build editorial {buildId}</p>}
            {onStartSimulado && (
              <button
                type="button"
                onClick={() => void startEditorialSimulado()}
                disabled={isBuildingSample || total === 0}
                className="button-primary mt-4 min-h-[44px] disabled:opacity-50"
              >
                {isBuildingSample ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookMarked className="h-4 w-4" />}
                Praticar 10 questões dos filtros
              </button>
            )}
          </div>
        </div>
      </header>

      <form
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          updateFilter('query', draftQuery);
        }}
      >
        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Buscar no banco editorial</span>
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              className="input-field min-h-[44px] w-full pl-9"
              placeholder="Buscar nas questões"
            />
          </label>
          <button type="submit" className="button-primary min-h-[44px] min-w-[44px] px-3" aria-label="Aplicar busca"><Search className="h-4 w-4" /></button>
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            className="button-secondary relative min-h-[44px] min-w-[44px] px-3 sm:hidden"
            aria-expanded={showMobileFilters}
            aria-controls="editorial-advanced-filters"
            aria-label={`Filtros avançados${activeFilterCount ? `, ${activeFilterCount} ativos` : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-800 px-1 text-[10px] font-black text-white">{activeFilterCount}</span>}
          </button>
        </div>
        <div id="editorial-advanced-filters" className={`${showMobileFilters ? 'grid' : 'hidden'} mt-3 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4`}>
          <select
            aria-label="Filtrar por tema curricular"
            className="input-field min-h-[44px]"
            value={filters.moduleId || ''}
            onChange={(event) => updateFilter('moduleId', event.target.value)}
          >
            <option value="">Todos os temas curriculares</option>
            {moduleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input aria-label="Filtrar por tema" className="input-field min-h-[44px]" value={filters.topic || ''} onChange={(event) => updateFilter('topic', event.target.value)} placeholder="Tema" />
          <input aria-label="Filtrar por banca ou fonte" className="input-field min-h-[44px]" value={filters.bank || ''} onChange={(event) => updateFilter('bank', event.target.value)} placeholder="Banca ou fonte" />
          <input aria-label="Filtrar por ano" className="input-field min-h-[44px]" inputMode="numeric" value={filters.year || ''} onChange={(event) => updateFilter('year', event.target.value)} placeholder="Ano" />
        </div>
      </form>

      {!isLoading && !error && (
        <div className="flex items-center justify-between text-sm text-slate-600" aria-live="polite">
          <span><strong className="text-slate-900">{total}</strong> questões encontradas</span>
          <span>Exibindo {total ? offset + 1 : 0}–{Math.min(offset + PAGE_SIZE, total)}</span>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 font-bold text-rose-800 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </button>
        </div>
      )}

      {isLoading ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Carregando banco editorial…</div>
      ) : items.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article key={item.questionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800">
                      {item.editorialProjection.banks[0] || 'Concurso Público'}
                    </span>
                    <h2 className="mt-1 font-bold text-slate-900 line-clamp-2">{learnerTopicName(item.editorialProjection.topicNames)}</h2>
                  </div>
                  <StudyBadge tone={item.editorialProjection.answerType === 'CERTO_ERRADO' ? 'contrast' : 'concept'}>
                    {item.editorialProjection.answerType === 'CERTO_ERRADO' ? 'CERTO/ERRADO' : 'MÚLTIPLA ESCOLHA'}
                  </StudyBadge>
                </div>
                <p className="mt-2 text-xs text-slate-600 font-medium">
                  {item.editorialProjection.banks.join(', ') || 'Fonte da apostila'}
                  {item.editorialProjection.years.length ? ` · ${item.editorialProjection.years.join(', ')}` : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.suvecaDerived.moduleIds.map((moduleId) => (
                    <StudyBadge key={moduleId} tone="concept">
                      {getLessonName(moduleId)}
                    </StudyBadge>
                  ))}
                  {item.editorialProjection.hasCommentary && (
                    <StudyBadge tone="rule">
                      Comentada
                    </StudyBadge>
                  )}
                </div>
              </div>
              <button type="button" onClick={() => void openQuestion(item.questionId)} className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100 transition"><ExternalLink className="h-3.5 w-3.5" /> Estudar questão</button>
            </article>
          ))}
        </div>
      ) : !error ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-12 text-center text-sm text-slate-600">
          Nenhuma questão corresponde aos filtros escolhidos.
        </div>
      ) : null}

      <nav className="flex justify-center gap-3" aria-label="Paginação das questões editoriais">
        <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} className="button-secondary min-h-[44px] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button>
        <button type="button" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} className="button-secondary min-h-[44px] disabled:opacity-40">Próxima <ChevronRight className="h-4 w-4" /></button>
      </nav>

      {isDetailOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 sm:items-center sm:p-4">
          <div ref={detailDialogRef} tabIndex={-1} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:rounded-2xl sm:p-7 space-y-5" role="dialog" aria-modal="true" aria-label="Questão editorial completa">
            {isLoadingDetail || !detail ? (
              <div role="status" className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div>
            ) : (() => {
              const normalized = detail.editorial.normalized as EditorialNormalizedQuestion;
              const isTrueFalse = normalized.questionType === 'CERTO_ERRADO';
              const presentationUnavailable = normalized.presentation?.contextStatus === 'source_missing'
                || normalized.presentation?.formattingStatus === 'source_missing';
              const correctAnswer = String(normalized.correctAnswer || detail.editorialProjection.correctAnswer).toUpperCase();
              const source = normalized.bank || normalized.sourceLabel || 'Fonte editorial da apostila';
              return (
                <>
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StudyBadge tone="contrast">Questão Oficial</StudyBadge>
                        <span className="flex items-center gap-1 text-xs text-slate-600 font-medium"><ShieldCheck className="h-3.5 w-3.5 text-teal-700" /> Conteúdo preservado</span>
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 mt-1">{learnerTopicName(detail.editorialProjection.topicNames)}</h3>
                    </div>
                    <button ref={closeButtonRef} type="button" onClick={closeDetail} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-slate-100 transition" aria-label="Fechar questão"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-800"><Database className="mr-1 inline h-3.5 w-3.5 text-teal-700" />{formatOfficialContent(source)}</span>
                    {normalized.year && <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-800">{normalized.year}</span>}
                    <span className="rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 font-semibold text-teal-900">{normalized.primaryLessonId || detail.editorialProjection.primaryLessonId}</span>
                  </div>
                  <QuestionPresentationContent
                    presentation={normalized.presentation}
                    supportText={formatOfficialContent(normalized.supportText)}
                    prompt={formatOfficialContent(normalized.prompt)}
                  />
                  {isTrueFalse ? (
                    <div className="grid grid-cols-2 gap-3">
                      {['C', 'E'].map((answer) => {
                        const isSelected = detailAnswer === answer;
                        const isCorrect = correctAnswer === answer;
                        const stateClass = isDetailRevealed && isCorrect
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500'
                          : isDetailRevealed && isSelected
                            ? 'border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-500'
                            : isSelected
                              ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                        return (
                          <button key={answer} type="button" disabled={isDetailRevealed || presentationUnavailable} onClick={() => setDetailAnswer(answer)} aria-pressed={isSelected} className={`min-h-12 rounded-xl border p-3.5 text-center text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${stateClass}`}>
                            {isDetailRevealed && isCorrect && <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-emerald-700" />}{answer === 'C' ? 'Certo' : 'Errado'}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <ol className="space-y-2">
                      {(normalized.options || []).map((option, index) => {
                        const letter = String(option.letter || option.label || String.fromCharCode(65 + index)).toUpperCase();
                        const isCorrect = correctAnswer === letter;
                        const isSelected = detailAnswer === letter;
                        const stateClass = isDetailRevealed && isCorrect
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500'
                          : isDetailRevealed && isSelected
                            ? 'border-rose-400 bg-rose-50 text-rose-950 ring-2 ring-rose-500'
                            : isSelected
                              ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50';
                        return (
                          <li key={`${letter}-${index}`}>
                            <button type="button" disabled={isDetailRevealed || presentationUnavailable} onClick={() => setDetailAnswer(letter)} aria-pressed={isSelected} className={`min-h-12 w-full rounded-xl border p-3.5 text-left text-sm leading-relaxed transition disabled:cursor-not-allowed disabled:opacity-50 ${stateClass}`}>
                              {isDetailRevealed && isCorrect && <CheckCircle2 className="mr-1.5 inline h-4 w-4 text-emerald-700" />}<strong>{letter}.</strong>{' '}
                              <InlineRichText>{normalized.presentation?.optionRichText?.[letter] || formatOfficialContent(option.text)}</InlineRichText>
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                  {!isDetailRevealed ? (
                    <button type="button" disabled={!detailAnswer || presentationUnavailable} onClick={() => setIsDetailRevealed(true)} className="button-primary min-h-11 w-full disabled:cursor-not-allowed disabled:opacity-50">
                      Verificar resposta
                    </button>
                  ) : (
                    <>
                      <div role="status" className={`rounded-xl border p-3 text-sm font-bold ${detailAnswer === correctAnswer ? 'border-emerald-300 bg-emerald-50 text-emerald-950' : 'border-rose-300 bg-rose-50 text-rose-950'}`}>
                        {detailAnswer === correctAnswer ? 'Resposta correta.' : `Resposta incorreta. Gabarito: ${answerLabel(correctAnswer)}.`}
                      </div>
                      <QuestionCommentaryRenderer
                        commentary={normalized.commentary || ''}
                        correctAnswerLabel={answerLabel(correctAnswer)}
                      />
                      <button type="button" onClick={() => { setDetailAnswer(''); setIsDetailRevealed(false); }} className="button-secondary min-h-11 w-full">
                        Tentar novamente
                      </button>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
