import React from 'react';
import {
  AlertTriangle,
  Lightbulb,
  ShieldAlert,
  Info,
  Scale,
  Sparkles,
  Zap,
} from 'lucide-react';
import { STUDY_TONES, type StudyTone } from './studyVisualTokens';
import { InlineRichText } from '../pedagogical/blocks/InlineRichText';

interface StudyCalloutProps {
  tone?: StudyTone;
  title?: string;
  text?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children?: React.ReactNode;
}

const DEFAULT_ICONS: Record<StudyTone, React.ComponentType<{ className?: string }>> = {
  rule: Scale,
  procedure: Zap,
  contrast: Scale,
  example: Lightbulb,
  trap: AlertTriangle,
  exception: ShieldAlert,
  mnemonic: Sparkles,
  concept: Info,
  question: Info,
  suveca: Sparkles,
};

export const StudyCallout: React.FC<StudyCalloutProps> = ({
  tone = 'concept',
  title,
  text,
  icon,
  className = '',
  children,
}) => {
  const config = STUDY_TONES[tone] || STUDY_TONES.concept;
  const Icon = icon || DEFAULT_ICONS[tone] || Info;

  return (
    <div
      className={`my-3.5 rounded-xl border p-3.5 sm:p-4 transition-colors select-text ${config.surfaceBorder} ${config.surfaceBg} ${className}`}
      role="region"
      aria-label={title || config.label}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${config.badgeBg} border ${config.badgeBorder} select-none`}
        >
          <Icon className={`h-4 w-4 ${config.accentColor}`} />
        </div>
        <div className="space-y-1 min-w-0 flex-1">
          {title && (
            <h4 className={`text-xs sm:text-sm font-black tracking-tight ${config.highlightText}`}>
              <InlineRichText>{title}</InlineRichText>
            </h4>
          )}
          {text && (
            <div className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
              <InlineRichText>{text}</InlineRichText>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};
