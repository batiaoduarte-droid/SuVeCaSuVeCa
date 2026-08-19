import React from 'react';
import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface BeforeAfterCardProps {
  title?: string;
  before: {
    text: string;
    label?: string;
    explanation?: string;
  };
  after: {
    text: string;
    label?: string;
    explanation?: string;
  };
  decisiveRule?: string;
  className?: string;
}

export const BeforeAfterCard: React.FC<BeforeAfterCardProps> = ({
  title,
  before,
  after,
  decisiveRule,
  className = '',
}) => {
  return (
    <div
      className={`my-3.5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3.5 select-text ${className}`}
    >
      {title && (
        <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 border-b border-slate-100 pb-2">
          <InlineRichText>{title}</InlineRichText>
        </h4>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Before / Wrong */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-rose-800 font-black text-xs select-none">
            <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span className="uppercase tracking-wider text-[10px]">
              {before.label || 'Incorreto / Armadilha'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-rose-950 font-serif leading-relaxed">
            “<InlineRichText>{before.text}</InlineRichText>”
          </p>
          {before.explanation && (
            <p className="text-[11px] font-medium text-rose-900 leading-relaxed border-t border-rose-200/60 pt-1.5">
              <InlineRichText>{before.explanation}</InlineRichText>
            </p>
          )}
        </div>

        {/* After / Correct */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs select-none">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="uppercase tracking-wider text-[10px]">
              {after.label || 'Correto / Norma Culta'}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-bold text-emerald-950 font-serif leading-relaxed">
            “<InlineRichText>{after.text}</InlineRichText>”
          </p>
          {after.explanation && (
            <p className="text-[11px] font-medium text-emerald-900 leading-relaxed border-t border-emerald-200/60 pt-1.5">
              <InlineRichText>{after.explanation}</InlineRichText>
            </p>
          )}
        </div>
      </div>

      {decisiveRule && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-2.5 text-xs text-teal-950 font-medium">
          <strong className="text-teal-900 block text-[10px] uppercase tracking-wider mb-0.5 select-none">
            Regra Aplicada:
          </strong>
          <InlineRichText>{decisiveRule}</InlineRichText>
        </div>
      )}
    </div>
  );
};
