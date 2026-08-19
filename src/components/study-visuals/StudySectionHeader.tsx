import React from 'react';
import { STUDY_TONES, type StudyTone } from './studyVisualTokens';
import { StudyBadge } from './StudyBadge';

interface StudySectionHeaderProps {
  number?: string | number;
  title: string;
  subtitle?: string;
  tone?: StudyTone;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  itemCount?: number;
  className?: string;
}

export const StudySectionHeader: React.FC<StudySectionHeaderProps> = ({
  number,
  title,
  subtitle,
  tone = 'concept',
  icon: Icon,
  badge,
  itemCount,
  className = '',
}) => {
  const config = STUDY_TONES[tone] || STUDY_TONES.concept;

  return (
    <div className={`space-y-1.5 border-b border-slate-100 pb-3 mb-4 select-text ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {number && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-teal-900 text-xs font-black text-white select-none">
              {number}
            </span>
          )}
          {Icon && (
            <div className={`p-1 rounded-md ${config.badgeBg} border ${config.badgeBorder} select-none`}>
              <Icon className={`h-4 w-4 ${config.accentColor}`} />
            </div>
          )}
          <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2 select-none">
          {badge && <StudyBadge tone={tone}>{badge}</StudyBadge>}
          {typeof itemCount === 'number' && (
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="text-xs sm:text-sm font-medium text-slate-600 leading-relaxed max-w-3xl">
          {subtitle}
        </p>
      )}
    </div>
  );
};
