import React from 'react';
import { Sparkles, Brain, Zap, Clock } from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface MnemonicCardProps {
  title: string;
  phrase?: string;
  hook?: string;
  explanation?: string;
  acronym?: string;
  tags?: string[];
  className?: string;
}

export const MnemonicCard: React.FC<MnemonicCardProps> = ({
  title,
  phrase,
  hook,
  explanation,
  acronym,
  tags = [],
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-yellow-300 bg-yellow-50/50 p-4 sm:p-5 shadow-xs hover:border-yellow-400 transition-all space-y-3 select-text ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-yellow-200/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-yellow-600 text-white select-none shadow-2xs">
            <Brain className="h-4 w-4" />
          </div>
          <h4 className="text-sm sm:text-base font-black tracking-tight text-yellow-950">
            <InlineRichText>{title}</InlineRichText>
          </h4>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-200/70 border border-yellow-400 px-2.5 py-0.5 text-[10px] font-black text-yellow-950 uppercase tracking-wider select-none">
          <Clock className="h-3 w-3 text-yellow-800" />
          Lembre em 5 Segundos
        </span>
      </div>

      {/* Main Hook / Acronym */}
      {(phrase || hook || acronym) && (
        <div className="rounded-xl border border-yellow-300 bg-white p-3.5 space-y-1.5 shadow-2xs">
          {acronym && (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-yellow-600 px-2 py-0.5 text-xs font-black text-white select-none">
                {acronym}
              </span>
            </div>
          )}
          <p className="text-sm sm:text-base font-black text-yellow-950 leading-snug font-serif">
            <InlineRichText>{phrase || hook || ''}</InlineRichText>
          </p>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
          <InlineRichText>{explanation}</InlineRichText>
        </p>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 select-none">
          {tags.map((tag, idx) => (
            <span
              key={idx}
              className="rounded-md bg-yellow-100/80 border border-yellow-300 px-2 py-0.5 text-[10px] font-bold text-yellow-900"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
