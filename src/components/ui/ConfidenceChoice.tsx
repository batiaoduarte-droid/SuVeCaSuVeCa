import React from 'react';
import { HelpCircle, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

export type ConfidenceLevel = 'guess' | 'low' | 'medium' | 'high';
const levels = [
  {
    id: 'guess',
    label: 'Chute',
    description: 'Não tenho certeza da regra',
    Icon: HelpCircle,
    idleClass: 'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400 hover:bg-slate-100/80',
    activeClass: 'border-slate-800 bg-slate-800 text-white shadow-sm ring-2 ring-slate-300 ring-offset-1',
    iconClass: 'text-slate-600',
    descClass: 'text-slate-600',
  },
  {
    id: 'low',
    label: 'Pouco Seguro',
    description: 'Lembro vagamente',
    Icon: AlertCircle,
    idleClass: 'border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400 hover:bg-amber-100/70',
    activeClass: 'border-amber-800 bg-amber-800 text-white shadow-sm ring-2 ring-amber-300 ring-offset-1',
    iconClass: 'text-amber-700',
    descClass: 'text-amber-800',
  },
  {
    id: 'medium',
    label: 'Seguro',
    description: 'Conheço a regra padrão',
    Icon: CheckCircle2,
    idleClass: 'border-blue-300 bg-blue-50 text-blue-900 hover:border-blue-400 hover:bg-blue-100/70',
    activeClass: 'border-blue-700 bg-blue-700 text-white shadow-sm ring-2 ring-blue-300 ring-offset-1',
    iconClass: 'text-blue-700',
    descClass: 'text-blue-800',
  },
  {
    id: 'high',
    label: 'Muito Seguro',
    description: 'Certeza justificável',
    Icon: Flame,
    idleClass: 'border-emerald-400 bg-emerald-50 text-emerald-950 hover:border-emerald-500 hover:bg-emerald-100/70',
    activeClass: 'border-emerald-700 bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-300 ring-offset-1',
    iconClass: 'text-emerald-700',
    descClass: 'text-emerald-800',
  },
] as const;

/** Pure presentation: each study flow owns its submission and persistence rules. */
export function ConfidenceChoice({ value, onChange, disabled = false }: {
  value: ConfidenceLevel | null; onChange: (value: ConfidenceLevel) => void; disabled?: boolean;
}) {
  return <fieldset className="min-w-0 space-y-3">
    <legend className="text-sm font-semibold text-slate-800">Confiança na resposta</legend>
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {levels.map(({ id, label, description, Icon, idleClass, activeClass, iconClass, descClass }) => {
        const isSelected = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            onClick={() => onChange(id)}
            className={`flex min-h-20 min-w-0 flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-55 ${
              isSelected ? activeClass : idleClass
            }`}
          >
            <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : iconClass}`} aria-hidden="true" />
            <span className="mt-1 text-xs font-bold">{label}</span>
            <span className={`text-[11px] leading-tight ${isSelected ? 'text-white/95' : descClass}`}>{description}</span>
          </button>
        );
      })}
    </div>
  </fieldset>;
}
