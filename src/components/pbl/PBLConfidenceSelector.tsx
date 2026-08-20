import React from 'react';
import type { PBLConfidenceLevel } from '../../types/pbl';
import { HelpCircle, AlertCircle, CheckCircle2, Flame } from 'lucide-react';

interface PBLConfidenceSelectorProps {
  confidence: PBLConfidenceLevel | null;
  onSelectConfidence: (level: PBLConfidenceLevel) => void;
  reasoning: string;
  onChangeReasoning: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
}

export const PBLConfidenceSelector: React.FC<PBLConfidenceSelectorProps> = ({
  confidence,
  onSelectConfidence,
  reasoning,
  onChangeReasoning,
  onSubmit,
  disabled = false,
  submitLabel = 'Confirmar hipótese e analisar',
}) => {
  const levels: Array<{ id: PBLConfidenceLevel; label: string; icon: React.ElementType; color: string; desc: string }> = [
    {
      id: 'guess',
      label: 'Chute',
      icon: HelpCircle,
      color: 'border-slate-300 hover:border-slate-400 text-slate-700 bg-slate-50',
      desc: 'Não tenho certeza da regra',
    },
    {
      id: 'low',
      label: 'Pouco Seguro',
      icon: AlertCircle,
      color: 'border-amber-300 hover:border-amber-400 text-amber-800 bg-amber-50',
      desc: 'Lembro vagamente',
    },
    {
      id: 'medium',
      label: 'Seguro',
      icon: CheckCircle2,
      color: 'border-blue-300 hover:border-blue-400 text-blue-800 bg-blue-50',
      desc: 'Conheço a regra padrão',
    },
    {
      id: 'high',
      label: 'Muito Seguro',
      icon: Flame,
      color: 'border-emerald-400 hover:border-emerald-500 text-emerald-900 bg-emerald-50',
      desc: 'Certeza absoluta e justificável',
    },
  ];

  return (
    <div className="mt-6 rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50/50 to-white p-5 shadow-xs">
      <div className="mb-3">
        <label className="text-xs font-bold uppercase tracking-wider text-indigo-900">
          Qual é o seu nível de confiança nesta resposta?
        </label>
        <p className="text-xs text-slate-600">
          O PBL utiliza sua confiança para diagnosticar se houve domínio ou ilusão de competência.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {levels.map((lvl) => {
          const Icon = lvl.icon;
          const isSelected = confidence === lvl.id;
          return (
            <button
              key={lvl.id}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelectConfidence(lvl.id)}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 ring-offset-1'
                  : lvl.color
              }`}
            >
              <Icon className={`h-5 w-5 ${isSelected ? 'text-white' : ''}`} />
              <span className="mt-1 text-xs font-bold">{lvl.label}</span>
              <span className={`text-[10px] ${isSelected ? 'text-indigo-100' : 'text-slate-600'}`}>
                {lvl.desc}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <label className="text-xs font-semibold text-slate-700">
          Qual foi o seu critério ou regra de decisão? <span className="text-slate-600">(opcional)</span>
        </label>
        <input
          type="text"
          value={reasoning}
          onChange={(e) => onChangeReasoning(e.target.value)}
          placeholder="Ex.: Troquei por 'ao', ou observei o pronome relativo..."
          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !confidence}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
};
