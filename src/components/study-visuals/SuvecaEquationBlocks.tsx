import React from 'react';
import { SUVECA_BLOCK_COLORS } from './studyVisualTokens';

const EQUATION_COMPONENTS = [
  { type: 'su', code: 'Su', name: 'Sujeito' },
  { type: 've', code: 'Ve', name: 'Verbo' },
  { type: 'c', code: 'C', name: 'Complemento' },
  { type: 'a', code: 'A', name: 'Adjunto' },
  { type: 'pred', code: 'Pred', name: 'Predicativo' },
] as const;

interface SuvecaEquationBlocksProps {
  compact?: boolean;
  className?: string;
}

export const SuvecaEquationBlocks: React.FC<SuvecaEquationBlocksProps> = ({ compact = false, className = '' }) => (
  <div
    className={`grid grid-cols-2 gap-2 sm:grid-cols-5 ${className}`}
    role="list"
    aria-label="Sujeito mais Verbo mais Complemento mais Adjunto mais Predicativo"
  >
    {EQUATION_COMPONENTS.map((component) => {
      const color = SUVECA_BLOCK_COLORS[component.type];
      return (
        <div
          key={component.code}
          role="listitem"
          className={`min-w-0 rounded-xl border ${color.border} ${color.bg} ${component.type === 'pred' ? 'col-span-2 sm:col-span-1' : ''} ${compact ? 'p-2.5' : 'p-3.5'}`}
        >
          <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5">
            <span className={`inline-flex shrink-0 rounded-md px-2 py-1 text-[10px] font-black ${color.pill}`}>
              {component.code}
            </span>
            <span className={`truncate text-xs font-black ${color.text} ${compact ? '' : 'sm:text-sm'}`}>
              {component.name}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);
