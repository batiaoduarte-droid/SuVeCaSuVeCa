const CONTEXT_REFERENCE = /\b(?:texto\s+(?:[A-Z]{1,4}\d[A-Z]?\d?|anterior)|parágrafo\s+\d+|linha\s+\d+)/i;
const VISUAL_REFERENCE = /\b(?:destacad[ao]s?|sublinhad[ao]s?|grif[ao]d[ao]s?|negrito)\b/i;
const RICH_EMPHASIS = /(?:\*\*[^*]+\*\*|\*[^*]+\*)/;

interface VisualPresentation {
  commandRichText?: string;
  supportRichText?: string;
  optionRichText?: Record<string, string>;
  media?: Array<{ url?: string }>;
}

export const requiresIdentifiedContext = (prompt: string): boolean => CONTEXT_REFERENCE.test(prompt);
export const requiresVisualEmphasis = (prompt: string): boolean => VISUAL_REFERENCE.test(prompt);
export const containsRichEmphasis = (...values: Array<string | undefined | null>): boolean =>
  RICH_EMPHASIS.test(values.filter(Boolean).join('\n'));
export const hasSourceBackedVisualPresentation = (
  presentation?: VisualPresentation,
  support?: string,
): boolean => Boolean(
  presentation?.media?.some((asset) => String(asset.url || '').trim())
  || containsRichEmphasis(
    presentation?.commandRichText,
    presentation?.supportRichText,
    support,
    ...Object.values(presentation?.optionRichText || {}),
  )
);
