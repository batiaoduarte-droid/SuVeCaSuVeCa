import React from 'react';
import { BookOpen } from 'lucide-react';
import type { ContentBlock } from '../../../types/pedagogicalView';
import { ContentBlockRenderer } from '../blocks/ContentBlockRenderer';

interface ExplanationSectionProps {
  blocks?: ContentBlock[];
}

export const ExplanationSection: React.FC<ExplanationSectionProps> = ({ blocks = [] }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-4 surface p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-800 shadow-2xs">
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

      <div className="space-y-3.5 reading-content">
        {blocks.map((block, idx) => (
          <ContentBlockRenderer key={idx} block={block} />
        ))}
      </div>
    </div>
  );
};
