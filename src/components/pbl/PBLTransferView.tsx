import React from 'react';
import type { PBLQuestionPresentation, PBLTransferItem } from '../../types/pbl';
import { Layers, SearchCheck } from 'lucide-react';
import { QuestionPresentationContent } from '../QuestionPresentationContent';

interface PBLTransferViewProps {
  transferItem?: PBLTransferItem;
  question: PBLQuestionPresentation;
  kind?: 'transfer' | 'reattempt' | 'probe';
  itemIndex?: number;
  totalItems?: number;
  selectedAnswer: string;
  onSelectAnswer: (answer: string) => void;
  disabled?: boolean;
  feedbackMessage?: string;
}

export const PBLTransferView: React.FC<PBLTransferViewProps> = ({
  transferItem,
  question,
  kind = 'transfer',
  itemIndex = 0,
  totalItems = 4,
  selectedAnswer,
  onSelectAnswer,
  disabled = false,
  feedbackMessage,
}) => {
  const typeLabels: Record<string, string> = {
    isomorphic: 'Mesma regra em novo contexto',
    near_transfer: 'Transferência próxima',
    boundary_case: 'Caso-limite ou exceção',
    far_transfer: 'Transferência distante',
    inverted_transfer: 'Transferência invertida',
  };
  const hasAuditedTransferType = transferItem?.validationStatus === 'audited';
  const heading = kind === 'probe'
    ? 'Sondagem diagnóstica'
    : kind === 'reattempt'
      ? 'Nova aplicação após a intervenção'
      : hasAuditedTransferType
        ? typeLabels[transferItem?.transferType || ''] || 'Transferência auditada'
        : 'Nova aplicação em outro item';
  const options = question.options.length
    ? question.options
    : [
        { label: 'Certo', text: 'A assertiva está correta.' },
        { label: 'Errado', text: 'A assertiva está incorreta.' },
      ];

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      data-pbl-question-ref={question.questionRef}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-800">
          {kind === 'probe' ? <SearchCheck className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
          {heading}
        </span>
        {kind === 'transfer' && (
          <span className="text-xs font-semibold text-slate-600">Item {itemIndex + 1} de até {totalItems}</span>
        )}
      </div>

      {feedbackMessage && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
          {feedbackMessage}
        </div>
      )}

      {transferItem?.cognitiveDelta && kind === 'transfer' && hasAuditedTransferType && (
        <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-950">
          <strong>O que mudou:</strong> {transferItem.cognitiveDelta}
        </div>
      )}
      {transferItem && kind === 'transfer' && !hasAuditedTransferType && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
          {transferItem.recentExposureFallback
            ? 'Este item foi visto recentemente e só foi reutilizado porque não havia alternativa nova publicada. O resultado conta como prática, sem confirmar transferência.'
            : 'Esta questão verifica nova aplicação. A distância estrutural do item ainda não é usada como evidência de transferência distante.'}
        </div>
      )}
      {transferItem?.recentExposureFallback && kind === 'reattempt' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          Esta questão precisou ser reutilizada por falta de outra aplicação publicada. O acerto ajuda a praticar, mas não comprova generalização.
        </div>
      )}

      <QuestionPresentationContent presentation={question.presentation} supportText={question.supportText} prompt={question.prompt} />

      <div className="mt-6 space-y-3" role="group" aria-label="Alternativas da questão">
        {options.map((option) => {
          const isSelected = selectedAnswer.toUpperCase() === option.label.toUpperCase();
          return (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelectAnswer(option.label)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs transition-all ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-950 shadow-xs ring-2 ring-indigo-200'
                  : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-bold ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                {option.label.toUpperCase()}
              </span>
              <span className="mt-0.5 leading-relaxed">{option.text}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 text-[11px] text-slate-600">
        {question.examBoard || transferItem?.examBoard || 'Questão oficial'}
        {question.year || transferItem?.year ? ` · ${question.year || transferItem?.year}` : ''}
      </div>
    </div>
  );
};
