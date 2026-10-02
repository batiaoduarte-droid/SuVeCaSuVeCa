import { PROFESSOR_MODELS, isProfessorModel, type ProfessorModel } from '../lib/geminiTaskMapping';

export function ProfessorModelSelect({ value, onChange, disabled }: {
  value: ProfessorModel; onChange: (model: ProfessorModel) => void; disabled: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-wrap items-center gap-2 px-4 py-2 text-xs text-slate-700">
      <span>Modelo de resposta</span>
      <select aria-label="Modelo de resposta" value={value} disabled={disabled}
        className="min-h-11 min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white px-2 text-slate-900 disabled:opacity-60"
        onChange={event => { if (isProfessorModel(event.target.value)) onChange(event.target.value); }}>
        {PROFESSOR_MODELS.map(model => <option key={model.id} value={model.id}>{model.label}</option>)}
      </select>
    </label>
  );
}
