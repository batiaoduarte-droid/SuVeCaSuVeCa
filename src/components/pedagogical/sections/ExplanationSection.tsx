import React from 'react';
import { BookOpen } from 'lucide-react';
import type { SemanticBlock, ExplanationGroup } from '../../../types/pedagogicalView';
import { SemanticBlockRenderer } from '../blocks/SemanticBlockRenderer';
import { InlineRichText } from '../blocks/InlineRichText';

interface ExplanationSectionProps {
  groups?: ExplanationGroup[];
  blocks?: SemanticBlock[];
}

export const ExplanationSection: React.FC<ExplanationSectionProps> = ({ groups = [], blocks = [] }) => {
  const hasGroups = groups && groups.length > 0;
  const hasBlocks = blocks && blocks.length > 0;

  if (!hasGroups && !hasBlocks) return null;

  return (
    <div className="explanation-frame space-y-5 surface p-3 sm:p-5 select-text">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs select-none">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <h3 className="m-0 text-base font-black tracking-tight text-slate-900">
            Explicação didática aprofundada
          </h3>
          <p className="m-0 text-xs text-slate-600 font-medium">
            Fundamentação teórica, mecanismos sintáticos e análise conceitual
          </p>
        </div>
      </div>

      {/* Renderiza Grupos Semânticos Hierárquicos v4.2 */}
      {hasGroups ? (
        <div className="space-y-6">
          {groups.map((grp, gIdx) => (
            <div
              key={grp.groupId || gIdx}
              className="explanation-group rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-4 shadow-2xs space-y-3"
            >
              {grp.title && (
                <div className="flex items-center gap-2 border-b border-teal-100/70 pb-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-900 text-xs font-black text-teal-100 select-none">
                    {gIdx + 1}
                  </span>
                  <h4 className="text-sm sm:text-base font-black text-teal-950 tracking-tight m-0">
                    <InlineRichText>{grp.title}</InlineRichText>
                  </h4>
                </div>
              )}

              {grp.pedagogicalGoal && (
                <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 text-xs font-medium leading-relaxed text-teal-950">
                  <strong className="mb-1 block text-[10px] uppercase tracking-wider text-teal-800">Objetivo deste bloco</strong>
                  <InlineRichText>{grp.pedagogicalGoal}</InlineRichText>
                </div>
              )}

              <div className="space-y-3 reading-content">
                {(grp.blocks || []).map((block, bIdx) => (
                  <SemanticBlockRenderer key={bIdx} block={block} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Fallback para lista direta de blocks */
        <div className="space-y-3.5 reading-content">
          {blocks.map((block, idx) => (
            <SemanticBlockRenderer key={idx} block={block} />
          ))}
        </div>
      )}
    </div>
  );
};
