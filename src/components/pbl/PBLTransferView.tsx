import React from 'react';
import type { PBLTransferItem } from '../../types/pbl';
import { Layers, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface PBLTransferViewProps {
  transferItem: PBLTransferItem;
  itemIndex: number;
  totalItems: number;
  selectedAnswer: string;
  onSelectAnswer: (ans: string) => void;
  onSubmitTransfer: () => void;
  disabled?: boolean;
}

export const PBLTransferView: React.FC<PBLTransferViewProps> = ({
  transferItem,
  itemIndex,
  totalItems,
  selectedAnswer,
  onSelectAnswer,
  onSubmitTransfer,
  disabled = false,
}) => {
  const typeLabels: Record<string, { label: string; color: string }> = {
    isomorphic: { label: 'Transferência Isomórfica (Mesma Regra)', color: 'bg-blue-100 text-blue-800' },
    near_transfer: { label: 'Transferência Próxima (Novo Contexto)', color: 'bg-emerald-100 text-emerald-800' },
    boundary_case: { label: 'Caso-Limite / Exceção', color: 'bg-amber-100 text-amber-800' },
    far_transfer: { label: 'Transferência Distante (Nova Banca)', color: 'bg-purple-100 text-purple-800' },
    inverted_transfer: { label: 'Transferência Invertida (Pela Negativa)', color: 'bg-rose-100 text-rose-800' },
  };

  const currentType = typeLabels[transferItem.transferType] || {
    label: transferItem.transferType,
    color: 'bg-slate-100 text-slate-800',
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Transfer Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${currentType.color}`}>
            <Layers className="h-3 w-3" /> {currentType.label}
          </span>
          <span className="text-xs text-slate-600">
            Item {itemIndex + 1} de {totalItems}
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-600">
          Banca: {transferItem.examBoard} ({transferItem.year || 2022})
        </div>
      </div>

      {/* Delta description */}
      <div className="mb-4 rounded-xl border border-indigo-50 bg-indigo-50/40 p-3 text-xs text-indigo-950">
        <span className="font-bold">Desafio Cognitivo:</span> {transferItem.cognitiveDelta}
      </div>

      {/* Target Question */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-medium text-slate-800">
        Julgue a assertiva sob a regra em estudo na questão <strong>{transferItem.officialQuestionRef}</strong>.
      </div>

      {/* Judgment Buttons */}
      <div className="mt-6 flex gap-4">
        {['Certo', 'Errado'].map((val) => {
          const isSelected = selectedAnswer.toUpperCase() === val.toUpperCase();
          const isCerto = val === 'Certo';
          return (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => onSelectAnswer(val)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-3.5 text-xs font-bold transition-all ${
                isSelected
                  ? isCerto
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-md'
                    : 'border-rose-600 bg-rose-600 text-white shadow-md'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {val.toUpperCase()}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          disabled={!selectedAnswer || disabled}
          onClick={onSubmitTransfer}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Validar Transferência <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
