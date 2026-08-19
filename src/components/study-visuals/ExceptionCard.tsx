import React from 'react';
import { ShieldAlert, AlertCircle } from 'lucide-react';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface ExceptionCardProps {
  title?: string;
  exceptions?: string[];
  text?: string;
  className?: string;
}

export const ExceptionCard: React.FC<ExceptionCardProps> = ({
  title = 'Exceção / Limite da Regra',
  exceptions = [],
  text,
  className = '',
}) => {
  if (!text && exceptions.length === 0) return null;

  return (
    <div
      className={`my-2.5 rounded-xl border border-purple-200 bg-purple-50/60 p-3 sm:p-4 space-y-2 select-text ${className}`}
    >
      <div className="flex items-center gap-2 text-purple-900 font-black text-xs select-none">
        <ShieldAlert className="h-4 w-4 text-purple-700 shrink-0" />
        <span className="uppercase tracking-wider text-[11px]">{title}</span>
      </div>

      {text && (
        <p className="text-xs sm:text-sm font-medium text-purple-950 leading-relaxed">
          <InlineRichText>{text}</InlineRichText>
        </p>
      )}

      {exceptions.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {exceptions.map((exc, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2 text-xs font-semibold text-purple-950 leading-relaxed"
            >
              <span className="text-purple-600 font-bold select-none">•</span>
              <InlineRichText>{exc}</InlineRichText>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
