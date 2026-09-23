import { useEffect, useState } from 'react';
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
    {error && <div role="alert"><p>Não foi possível carregar as questões.</p><button type="button" onClick={() => setRetry(n => n + 1)} className="min-h-11 px-4">Tentar novamente</button></div>}
    {!error && !loaded[page] && delivery.availableCount > 0 && <p role="status">Carregando questões…</p>}
    {Object.entries(loaded).map(([index, questions]) => <div key={index} hidden={Number(index) !== page}>
      <OfficialQuestionsSection questions={questions} lessonId={lessonId} userId={userId}
        totalQuestions={delivery.availableCount} numberOffset={Number(index) * 5} showPagination={false} />
    </div>)}
    {delivery.availableCount > 0 && <nav aria-label="Páginas de questões" className="mt-4 flex flex-wrap items-center gap-3">
      <span aria-live="polite">Página {page + 1} de {pageCount} · {delivery.availableCount} questões</span>
      <button type="button" disabled={page === 0} onClick={() => setPage(n => n - 1)} className="min-h-11 rounded-lg border px-4 disabled:opacity-50">Página anterior</button>
      <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage(n => n + 1)} className="min-h-11 rounded-lg border px-4 disabled:opacity-50">Próxima página</button>
    </nav>}
    {!delivery.availableCount && <p>Nenhuma questão possui fonte suficiente para uma tentativa segura.</p>}
    {onPracticeMore && <button type="button" onClick={onPracticeMore} className="mt-4 min-h-11 rounded-lg border px-4">Continuar praticando este tema</button>}
  </div>;
}

export function PublishedQuestionsSection(props: Parameters<typeof QuestionsDelivery>[0]) {
  return <QuestionsDelivery key={`${props.delivery.reconstructedSha256}:${props.userId || 'guest'}`} {...props} />;
}
