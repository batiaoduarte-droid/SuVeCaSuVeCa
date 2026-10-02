import React from 'react';
import type { PBLConfidenceLevel } from '../../types/pbl';
import { Mic } from 'lucide-react';
import { ConfidenceChoice } from '../ui/ConfidenceChoice';

interface PBLConfidenceSelectorProps {
  confidence: PBLConfidenceLevel | null;
  onSelectConfidence: (level: PBLConfidenceLevel) => void;
  reasoning: string;
  onChangeReasoning: (text: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitLabel?: string;
  onOpenDefense?: () => void;
}

export const PBLConfidenceSelector: React.FC<PBLConfidenceSelectorProps> = ({
  confidence,
  onSelectConfidence,
  reasoning,
  onChangeReasoning,
  onSubmit,
  disabled = false,
  submitLabel = 'Confirmar hipótese e analisar',
  onOpenDefense,
}) => {
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

      <ConfidenceChoice value={confidence} onChange={onSelectConfidence} disabled={disabled} />

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            Qual foi o seu critério ou regra de decisão? <span className="text-slate-600">(opcional)</span>
          </label>
          {onOpenDefense && (
            <button
              type="button"
              onClick={onOpenDefense}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 transition cursor-pointer select-none"
              title="Explicar oralmente ou via texto expandido (Método Feynman)"
            >
              <Mic className="h-3.5 w-3.5 text-teal-600" />
              <span>Sustentar / Gravar hipótese</span>
            </button>
          )}
        </div>
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
