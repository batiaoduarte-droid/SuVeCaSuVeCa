import React from 'react';
import { Scale, CheckCircle2, ShieldCheck, BookmarkCheck } from 'lucide-react';
import type { CanonicalEntityView, ContentBlock } from '../../types/pedagogicalView';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';
import { ExceptionCard } from './ExceptionCard';

interface GoldenRuleCardProps {
  rule: CanonicalEntityView;
  renderBlock?: (block: ContentBlock) => React.ReactNode;
  className?: string;
}

export const GoldenRuleCard: React.FC<GoldenRuleCardProps> = ({
  rule,
  renderBlock,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-teal-200 bg-white p-4 sm:p-6 shadow-xs hover:border-teal-300 transition-all select-text ${className}`}
    >
      <div className="space-y-3.5">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-800 text-teal-200 select-none shadow-2xs">
              <Scale className="h-4 w-4" />
            </div>
            <h4 className="text-sm sm:text-base font-black tracking-tight text-teal-950">
              <InlineRichText>{rule.title}</InlineRichText>
            </h4>
          </div>

          <div className="flex items-center gap-1.5 select-none">
            {rule.modality && (
              <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-extrabold text-teal-800 uppercase tracking-wider">
                {rule.modality}
              </span>
            )}
            {rule.scope && (
              <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                {rule.scope}
              </span>
            )}
          </div>
        </div>

        {/* Statement / Regra Decisiva Principal */}
        {rule.statement && (
          <div className="rounded-xl border border-teal-300 bg-teal-50/70 p-3.5 sm:p-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block mb-1 select-none">
              Enunciado da Regra
            </span>
            <p className="text-xs sm:text-sm font-bold text-teal-950 leading-relaxed font-serif">
              <InlineRichText>{rule.statement}</InlineRichText>
            </p>
          </div>
        )}

        {/* Conditions Checklist */}
        {rule.conditions && rule.conditions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block select-none">
              Condições Obrigatórias:
            </span>
            <ul className="space-y-1.5">
              {rule.conditions.map((cond, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs font-semibold text-slate-800 leading-relaxed"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0 select-none" />
                  <span>
                    <InlineRichText>{cond}</InlineRichText>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Exceptions */}
        {rule.exceptions && rule.exceptions.length > 0 && (
          <ExceptionCard exceptions={rule.exceptions} />
        )}

        {/* Secondary Content Blocks */}
        {rule.blocks && rule.blocks.length > 0 && renderBlock && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {rule.blocks.map((block, bIdx) => (
              <React.Fragment key={bIdx}>{renderBlock(block)}</React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
