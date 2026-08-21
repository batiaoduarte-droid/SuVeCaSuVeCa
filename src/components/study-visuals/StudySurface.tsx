import React from 'react';
import { STUDY_TONES, type StudyTone } from './studyVisualTokens';

interface StudySurfaceProps {
  tone?: StudyTone;
  className?: string;
  children: React.ReactNode;
  borderLeft?: boolean;
  padded?: boolean;
}

export const StudySurface: React.FC<StudySurfaceProps> = ({
  tone = 'concept',
  className = '',
  children,
  borderLeft = false,
  padded = true,
}) => {
  const config = STUDY_TONES[tone] || STUDY_TONES.concept;

  return (
    <div
      className={`rounded-2xl border transition-colors select-text ${config.surfaceBorder} ${config.surfaceBg} ${
        borderLeft ? `border-l-4 ${config.accentColor.replace('text-', 'border-')}` : ''
      } ${padded ? 'p-3 sm:p-5' : ''} ${className}`}
    >
      {children}
    </div>
  );
};
