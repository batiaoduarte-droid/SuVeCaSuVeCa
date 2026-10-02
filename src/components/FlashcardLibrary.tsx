import { useState } from 'react';
import type { CadernoErroItem } from '../types/suveca';
import { appendCardEvent, readCardEvents, type StoredFlashcard } from '../lib/flashcardStore';
import { toLearnerFacingContent } from '../lib/learnerContent';
import { getCardTopicLabel } from './FlashcardPractice';
import { projectFlashcardContent } from '../lib/flashcardContent';
import { FlashcardBackView } from './study-visuals/FlashcardBackView';
import { useReviewResource } from '../hooks/useReviewResource';

function LibraryAnswer({ card }: { card: StoredFlashcard }) {
  const [explanation, setExplanation] = useState(false);
  const { resource, error } = useReviewResource(card.source === 'suveca' && !card.content ? card.id : undefined);
  const compatible = resource?.front === card.front && resource?.back === card.back;
  return <>
    {error && <p className="text-sm text-amber-900">A apresentação complementar não carregou. Exibindo o texto salvo.</p>}
    <FlashcardBackView projection={projectFlashcardContent(card, compatible ? resource : null)} isExplanationVisible={explanation} onToggleExplanation={() => setExplanation(v => !v)} />
  </>;
}

export function FlashcardLibrary({ cards, errors, uid, onChange, onError, onStudy }: {
  cards: StoredFlashcard[]; errors: CadernoErroItem[]; uid?: string;
  onChange: () => void; onError: (error: unknown) => void; onStudy: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(20);
  const [editing, setEditing] = useState<string | null>(null);
  const [openAnswers, setOpenAnswers] = useState<Set<string>>(() => new Set());
  const [front, setFront] = useState(''), [back, setBack] = useState('');
  let events: ReturnType<typeof readCardEvents> = [];
  try { events = readCardEvents(uid); } catch { /* Store status displays the unreadable record. */ }
  const filtered = cards.filter(c => `${c.topic} ${c.front} ${c.back}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const mutate = (action: () => void) => {
    try { action(); onChange(); return true; } catch (error) { onError(error); return false; }
  };
  return <section aria-label="Biblioteca de flashcards" className="space-y-4">
    <label className="block text-sm font-semibold text-slate-700">Buscar na biblioteca
      <input className="mt-2 w-full min-h-11 rounded-xl border border-slate-300 p-3" value={search} onChange={e => { setSearch(e.target.value); setLimit(20); }} type="search" />
    </label>
    <p className="text-sm text-slate-600">{filtered.length} card(s), incluindo arquivados. Abrir o verso é uma consulta, sem XP e sem reagendamento.</p>
    {filtered.slice(0, limit).map(card => {
      const orphan = card.source === 'caderno' && !errors.some(e => e.id === card.errorId);
      const history = events.filter(e => e.cardId === card.id && ['review', 'edit', 'link', 'archive'].includes(e.kind));
      return <article key={card.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 break-words">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <strong>{getCardTopicLabel(card)}</strong>
          <span>{card.editorialStatus === 'retired' ? 'Edição anterior · histórico preservado' : card.archived ? 'Arquivado' : card.nextReviewAt ? `Próxima revisão: ${new Date(card.nextReviewAt).toLocaleString('pt-BR')}` : 'Disponível para revisar'}</span>
        </div>
        <p>{toLearnerFacingContent(card.front)}</p>
        <details onToggle={e => {
          const open = e.currentTarget.open;
          setOpenAnswers(previous => { const next = new Set(previous); if (open) next.add(card.id); else next.delete(card.id); return next; });
          if (e.currentTarget.open) mutate(() => { appendCardEvent(uid, { kind: 'exposure', cardId: card.id }); });
        }}><summary className="min-h-11 cursor-pointer py-3 text-teal-800 font-semibold">Consultar verso</summary>{openAnswers.has(card.id) && <LibraryAnswer card={card} />}</details>
        {orphan && <p className="text-sm text-amber-900">O registro de origem não está no Caderno atual. O card e seu histórico foram preservados.</p>}
        {card.source === 'caderno' && <label className="block text-sm text-slate-700">Vincular ao Caderno
          <select className="block mt-1 min-h-11 w-full rounded-lg border border-slate-300 p-2" value={orphan ? '' : card.errorId || ''} onChange={e => {
            if (e.target.value) mutate(() => { appendCardEvent(uid, { kind: 'link', cardId: card.id, errorId: e.target.value }); });
          }}><option value="">Selecione o registro de origem</option>{errors.map(e => <option key={e.id} value={e.id}>{e.conteudo}</option>)}</select>
        </label>}
        <div className="flex flex-wrap gap-3">
          {!card.archived && <button className="button-secondary min-h-11 px-3" onClick={() => onStudy(card.id)}>Estudar livremente</button>}
          {card.editorialStatus !== 'retired' && <button className="button-secondary min-h-11 px-3" onClick={() => mutate(() => { appendCardEvent(uid, { kind: 'archive', cardId: card.id, archived: !card.archived }); })}>{card.archived ? 'Restaurar card' : 'Arquivar card'}</button>}
          {card.source === 'caderno' && <button className="button-secondary min-h-11 px-3" onClick={() => { setEditing(card.id); setFront(card.front); setBack(card.back); }}>Editar card</button>}
        </div>
        {editing === card.id && <form className="space-y-3" onSubmit={e => {
          e.preventDefault();
          if (front.trim() && back.trim() && mutate(() => { appendCardEvent(uid, { kind: 'edit', cardId: card.id, front: front.trim(), back: back.trim() }); })) setEditing(null);
        }}>
          <label className="block">Pergunta<textarea required className="block w-full rounded-lg border p-3" value={front} onChange={e => setFront(e.target.value)} /></label>
          <label className="block">Resposta<textarea required className="block w-full rounded-lg border p-3" value={back} onChange={e => setBack(e.target.value)} /></label>
          <p className="text-sm text-slate-600">A edição preserva o histórico e o agendamento. Para uma nova pergunta, gere outro card.</p>
          <button className="button-primary min-h-11 px-3" type="submit">Salvar edição</button>
          <button className="button-secondary min-h-11 px-3 ml-2" type="button" onClick={() => setEditing(null)}>Cancelar</button>
        </form>}
        <details><summary className="min-h-11 cursor-pointer py-3 text-slate-700">Histórico · {card.correctCount + card.incorrectCount} revisão(ões)</summary>
          <p className="text-sm text-slate-600">Registros antigos podem conter apenas os totais e a última revisão. Datas ausentes não são reconstruídas.</p>
          <ol className="list-disc pl-5 space-y-2 text-sm mt-3">{history.map(e => <li key={e.id}>
            {new Date(e.at).toLocaleString('pt-BR')} — {e.kind === 'review' ? `Avaliação: ${{ again: 'Errei', hard: 'Difícil', good: 'Bom', easy: 'Fácil' }[e.rating!]}${e.usedHint ? ' (com consulta; intervalo ajustado)' : ''}` : e.kind === 'archive' ? e.archived ? 'Arquivado' : 'Restaurado' : e.kind === 'link' ? 'Vínculo atualizado' : 'Texto editado'}
          </li>)}</ol>
        </details>
      </article>;
    })}
    {filtered.length > limit && <button className="button-secondary min-h-11 px-4" onClick={() => setLimit(n => n + 20)}>Mostrar mais cards</button>}
  </section>;
}
