import { useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { OfficialQuestionView, QuestionDelivery } from '../../../types/pedagogicalView';
import { fetchPublishedJson, publishedUrl } from '../../../lib/publishedData';
import { OfficialQuestionsSection } from './OfficialQuestionsSection';

function QuestionsDelivery({ delivery, lessonId, userId, onPracticeMore }: {
  delivery: QuestionDelivery; lessonId: string; userId?: string; onPracticeMore?: () => void;
}) {
  const [page, setPage] = useState(0);
  const [loaded, setLoaded] = useState<Record<number, OfficialQuestionView[]>>({});
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const pageCount = Math.ceil(delivery.availableCount / 5);
  useEffect(() => {
    if (loaded[page] || page >= pageCount) return;
    const controller = new AbortController();
    setError('');
    let offset = 0;
    const descriptor = delivery.pages.find(item => {
      if (page * 5 < offset + item.count) return true;
      offset += item.count; return false;
    });
    if (!descriptor) { setError('Índice de questões incompleto.'); return; }
    void fetchPublishedJson<Array<{ index: number; question: OfficialQuestionView }>>(
      publishedUrl('/knowledge/pedagogical', descriptor.file), descriptor, controller.signal,
    ).then(records => {
      if (records.length !== descriptor.count || !records.every(record => record.question && Number.isInteger(record.index))) throw new Error('Página de questões incompleta.');
      if (!controller.signal.aborted) setLoaded(current => ({ ...current, [page]: records.slice(page * 5 - offset, page * 5 - offset + 5).map(r => r.question) }));
    }).catch(reason => { if (!controller.signal.aborted) setError(String(reason.message || reason)); });
    return () => controller.abort();
  }, [page, delivery, retry, loaded]);
  return <div>
    {delivery.totalOccurrences > delivery.availableCount && <p role="status" className="mb-4 text-sm text-amber-900">
      {delivery.totalOccurrences - delivery.availableCount} questões omitidas: a fonte publicada não permite tentativa segura.
    </p>}
    {error && <div role="alert"><p>Não foi possível carregar as questões.</p><button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50">Tentar novamente</button></div>}
    {!error && !loaded[page] && delivery.availableCount > 0 && <p role="status" className="text-sm font-semibold text-slate-600">Carregando questões…</p>}
    {Object.entries(loaded).map(([index, questions]) => <div key={index} hidden={Number(index) !== page}>
      <OfficialQuestionsSection questions={questions} lessonId={lessonId} userId={userId}
        totalQuestions={delivery.availableCount} numberOffset={Number(index) * 5} showPagination={false} />
    </div>)}
    {!delivery.availableCount && <p className="text-sm text-slate-700">Nenhuma questão possui fonte suficiente para uma tentativa segura.</p>}
    {(delivery.availableCount > 0 || onPracticeMore) && (
      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        {delivery.availableCount > 0 && (
          <nav aria-label="Páginas de questões" className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
            <span
              aria-live="polite"
              className="inline-flex items-center rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs"
            >
              Página {page + 1} de {pageCount} · {delivery.availableCount} questões
            </span>
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage(n => n - 1)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50/70 hover:text-teal-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-300 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Página anterior</span>
              </button>
              <button
                type="button"
                disabled={page >= pageCount - 1}
                onClick={() => setPage(n => n + 1)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 shadow-2xs transition hover:border-teal-400 hover:bg-teal-50/70 hover:text-teal-950 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-slate-300 disabled:hover:bg-white cursor-pointer"
              >
                <span>Próxima página</span>
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
              </button>
            </div>
          </nav>
        )}
        {onPracticeMore && (
          <div className={`flex items-center ${delivery.availableCount > 0 ? 'sm:border-l sm:border-slate-200/90 sm:pl-3' : ''}`}>
            <button
              type="button"
              onClick={onPracticeMore}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-2xs transition hover:bg-teal-900 sm:w-auto cursor-pointer"
            >
              <span>Continuar praticando este tema</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    )}
  </div>;
}

export function PublishedQuestionsSection(props: Parameters<typeof QuestionsDelivery>[0]) {
  return <QuestionsDelivery key={`${props.delivery.reconstructedSha256}:${props.userId || 'guest'}`} {...props} />;
}
