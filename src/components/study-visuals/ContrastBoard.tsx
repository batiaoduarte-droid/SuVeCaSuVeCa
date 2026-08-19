import React from 'react';
import { Scale, CheckCircle2, ArrowRightLeft, HelpCircle } from 'lucide-react';
import type { ContrastView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface ContrastBoardProps {
  contrast: ContrastView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

export const ContrastBoard: React.FC<ContrastBoardProps> = ({
  contrast,
  renderBlock,
  className = '',
}) => {
  const conceptA = contrast.conceptA || contrast.sideA?.label || 'Conceito A';
  const conceptB = contrast.conceptB || contrast.sideB?.label || 'Conceito B';

  const criteriaA = contrast.sideA?.criteria || [];
  const criteriaB = contrast.sideB?.criteria || [];

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs hover:border-slate-300 transition-all space-y-4 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-white select-none shadow-2xs">
            <ArrowRightLeft className="h-4 w-4" />
          </div>
          <h4 className="text-sm sm:text-base font-black tracking-tight text-slate-900">
            <InlineRichText>{contrast.title}</InlineRichText>
          </h4>
        </div>

        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-black text-slate-700 uppercase tracking-wider select-none">
          Contraste de Prova
        </span>
      </div>

      {/* Dual Column Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Side A */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-teal-200 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-teal-800 text-[10px] font-black text-white select-none">
              A
            </span>
            <h5 className="text-xs sm:text-sm font-black text-teal-950">
              <InlineRichText>{conceptA}</InlineRichText>
            </h5>
          </div>

          {criteriaA.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {criteriaA.map((crit, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs font-medium text-slate-800 leading-relaxed"
                >
                  <span className="text-teal-700 font-bold select-none">•</span>
                  <span>
                    <InlineRichText>{crit}</InlineRichText>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Side B */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-4 space-y-2.5">
          <div className="flex items-center gap-2 border-b border-sky-200 pb-2">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-800 text-[10px] font-black text-white select-none">
              B
            </span>
            <h5 className="text-xs sm:text-sm font-black text-sky-950">
              <InlineRichText>{conceptB}</InlineRichText>
            </h5>
          </div>

          {criteriaB.length > 0 && (
            <ul className="space-y-1.5 pt-1">
              {criteriaB.map((crit, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs font-medium text-slate-800 leading-relaxed"
                >
                  <span className="text-sky-700 font-bold select-none">•</span>
                  <span>
                    <InlineRichText>{crit}</InlineRichText>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Decisive Criterion Card */}
      {contrast.decisionCriterion && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-1">
          <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs select-none">
            <HelpCircle className="h-4 w-4 text-amber-700" />
            <span className="uppercase tracking-wider text-[10px]">
              Critério de Desempate / Decisão Rápida
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-amber-950 leading-relaxed">
            <InlineRichText>{contrast.decisionCriterion}</InlineRichText>
          </p>
        </div>
      )}

      {/* Secondary Blocks */}
      {contrast.blocks && contrast.blocks.length > 0 && renderBlock && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {contrast.blocks.map((block, bIdx) => (
            <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
