import { useMemo, useState } from 'react';
import type { DailyTip } from '../data/dailyTips';

export function SavedTipsView({ tips, onRemove, onOpenModule }: {
  tips: DailyTip[]; onRemove: (id: string) => void; onOpenModule?: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = useMemo(() => [...new Set(tips.map(tip => tip.category))].sort(), [tips]);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  const filtered = tips.filter(tip => (!category || tip.category === category)
    && normalize(`${tip.rule} ${tip.explanation} ${tip.example} ${tip.category}`).includes(normalize(query.trim())));
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-semibold text-slate-800">Buscar dicas
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2" />
      </label>
      <label className="text-sm font-semibold text-slate-800">Categoria
        <select value={category} onChange={event => setCategory(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white p-2">
          <option value="">Todas as categorias</option>
          {categories.map(item => <option key={item}>{item}</option>)}
        </select>
      </label>
    </div>
    <p role="status" className="text-sm text-slate-600">{filtered.length} dica(s) encontrada(s)</p>
    {!tips.length && <p className="text-sm text-slate-700">Salve uma dica para consultá-la aqui.</p>}
    <ul className="max-h-96 space-y-4 overflow-y-auto">
      {filtered.map(tip => <li key={tip.id} className="space-y-2 border-t border-amber-200 pt-3">
        <p className="text-xs font-semibold text-teal-800">{tip.category}</p>
        <h3 className="font-bold text-slate-900">{tip.rule}</h3>
        <p className="text-sm text-slate-700">{tip.explanation}</p>
        <blockquote className="text-sm italic text-teal-950">{tip.example}</blockquote>
        <div className="flex flex-wrap gap-2">
          {tip.moduleId && onOpenModule && <button type="button" className="button-primary min-h-11" onClick={() => onOpenModule(tip.moduleId!)}>Ver na apostila</button>}
          <button type="button" className="button-ghost min-h-11" aria-label={`Remover dica: ${tip.rule}`} onClick={() => onRemove(tip.id)}>Remover dos favoritos</button>
        </div>
      </li>)}
    </ul>
  </div>;
}
