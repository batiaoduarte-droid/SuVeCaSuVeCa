import React from 'react';
import { STUDY_TONES, type StudyTone } from './studyVisualTokens';

interface StudyBadgeProps {
  tone?: StudyTone;
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children?: React.ReactNode;
}

export const StudyBadge: React.FC<StudyBadgeProps> = ({
  tone = 'concept',
  label,
  icon: Icon,
  className = '',
  children,
}) => {
  const config = STUDY_TONES[tone] || STUDY_TONES.concept;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black tracking-tight whitespace-nowrap select-none ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} ${className}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label || children}
    </span>
  );
};
