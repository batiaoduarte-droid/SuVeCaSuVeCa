import React from 'react';
import {
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Syringe,
} from 'lucide-react';
import type { ExamTrapView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface BankTrapCardProps {
  trap: ExamTrapView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

export const BankTrapCard: React.FC<BankTrapCardProps> = ({
  trap,
  renderBlock,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-white p-4 sm:p-6 shadow-xs hover:border-amber-300 transition-all space-y-4 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-800 text-white select-none shadow-2xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <h4 className="text-sm sm:text-base font-black tracking-tight text-amber-950">
            <InlineRichText>{trap.title}</InlineRichText>
          </h4>
        </div>

        <span className="rounded-full bg-amber-50 border border-amber-300 px-2.5 py-0.5 text-[10px] font-black text-amber-900 uppercase tracking-wider select-none">
          Pegadinha de Banca
        </span>
      </div>

      {/* Trigger & Misleading Reasoning (O que parece / Por que engana) */}
      {(trap.trigger || trap.misleadingReasoning) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
          {trap.trigger && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-0.5 select-none">
                Gatilho da Pegadinha:
              </span>
              <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed font-serif">
                “<InlineRichText>{trap.trigger}</InlineRichText>”
              </p>
            </div>
          )}

          {trap.misleadingReasoning && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block mb-0.5 select-none">
                Por que a banca engana o candidato:
              </span>
              <p className="text-xs font-medium text-slate-700 leading-relaxed">
                <InlineRichText>{trap.misleadingReasoning}</InlineRichText>
              </p>
            </div>
          )}

          {trap.expectedWrongConclusion && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-100/70 border border-rose-200 px-3 py-1.5 text-xs font-bold text-rose-900">
              <XCircle className="h-4 w-4 text-rose-600 shrink-0 select-none" />
              <span>
                <strong>Erro induzido:</strong> <InlineRichText>{trap.expectedWrongConclusion}</InlineRichText>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Decisive Test */}
      {trap.decisiveTest && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-sky-900 font-black text-xs select-none">
            <HelpCircle className="h-4 w-4 text-sky-700" />
            <span className="uppercase tracking-wider text-[10px]">Teste Decisivo para Desarmar</span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-sky-950 leading-relaxed">
            <InlineRichText>{trap.decisiveTest}</InlineRichText>
          </p>
        </div>
      )}

      {/* Logical Vaccine / Correct Rule (Vacina) */}
      {(trap.correctReasoning || trap.correctiveRule) && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-emerald-900 font-black text-xs select-none">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span className="uppercase tracking-wider text-[10px]">
              Vacina Lógica / Correção Definitiva
            </span>
          </div>
          {trap.correctReasoning && (
            <p className="text-xs sm:text-sm font-bold text-emerald-950 leading-relaxed">
              <InlineRichText>{trap.correctReasoning}</InlineRichText>
            </p>
          )}
          {trap.correctiveRule && (
            <p className="text-xs text-emerald-900 font-semibold leading-relaxed border-t border-emerald-200 pt-1">
              <strong>Regra de Ouro:</strong> <InlineRichText>{trap.correctiveRule}</InlineRichText>
            </p>
          )}
        </div>
      )}

      {/* Secondary Blocks */}
      {trap.blocks && trap.blocks.length > 0 && renderBlock && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {trap.blocks.map((block, bIdx) => (
            <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
