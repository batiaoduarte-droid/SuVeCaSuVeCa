import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import type { FlashcardContentProjection } from '../../lib/flashcardContent';

interface FlashcardBackViewProps {
  projection: FlashcardContentProjection;
  isExplanationVisible: boolean;
  onToggleExplanation: () => void;
  className?: string;
}

export const FlashcardBackView: React.FC<FlashcardBackViewProps> = ({
  projection,
  isExplanationVisible,
  onToggleExplanation,
  className = '',
}) => {
  const { back, explanation, shouldShowExplanation, semanticBlocks } = projection;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Caso 1: Delimitadores semânticos identificados de forma inequívoca (Pegadinha/Erro vs Correção) */}
      {semanticBlocks && semanticBlocks.length > 0 ? (
        <div className="space-y-3">
          {semanticBlocks.map((block, idx) => {
            if (block.kind === 'trap') {
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 sm:p-5 transition"
                >
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                      {block.title}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-rose-950 leading-relaxed">
                    <InlineRichText>{block.text}</InlineRichText>
                  </p>
                </div>
              );
            }

            if (block.kind === 'mechanism') {
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 transition"
                >
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <Info className="h-4 w-4 text-amber-700 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                      {block.title}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-normal text-slate-800 leading-relaxed">
                    <InlineRichText>{block.text}</InlineRichText>
                  </div>
                </div>
              );
            }

            if (block.kind === 'correction') {
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 transition"
                >
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      {block.title}
                    </span>
                  </div>
                  <div className="text-xs sm:text-sm font-normal text-emerald-950 leading-relaxed font-serif">
                    <InlineRichText>{block.text}</InlineRichText>
                  </div>
                </div>
              );
            }

            // Exemplo / Contexto
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:p-4 text-xs text-slate-700"
              >
                <div className="font-bold text-slate-800 mb-1 select-none">{block.title}:</div>
                <div className="font-normal leading-relaxed text-slate-800">
                  <InlineRichText>{block.text}</InlineRichText>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Caso 2: Fallback canônico integral — preserva 100% o texto sem forçar templates artificiais e sem negrito maciço */
        <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4 sm:p-6 transition">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block mb-2 select-none">
            Resposta Canônica
          </span>
          <div className="text-sm sm:text-base font-normal text-slate-800 leading-relaxed whitespace-pre-line">
            <InlineRichText>{back}</InlineRichText>
          </div>
        </div>
      )}

      {/* Explicação Complementar Não Redundante: exibida APENAS se shouldShowExplanation for true */}
      {shouldShowExplanation && explanation && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onToggleExplanation}
            aria-expanded={isExplanationVisible}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-teal-800"
          >
            <Info className="h-4 w-4 text-teal-600" aria-hidden="true" />
            <span>{isExplanationVisible ? 'Ocultar explicação complementar' : 'Ver explicação complementar'}</span>
          </button>

          {isExplanationVisible && (
            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/90 p-4 sm:p-5 text-slate-800 text-xs sm:text-sm leading-relaxed animate-in fade-in">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 select-none">
                Explicação complementar
              </span>
              <InlineRichText>{explanation}</InlineRichText>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
