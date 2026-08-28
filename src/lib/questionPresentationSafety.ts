const CONTEXT_REFERENCE = /\b(?:texto\s+(?:[A-Z]{1,4}\d[A-Z]?\d?|anterior)|parágrafo\s+\d+|linha\s+\d+)/i;
const VISUAL_REFERENCE = /\b(?:destacad[ao]s?|sublinhad[ao]s?|grif[ao]d[ao]s?|negrito)\b/i;
const RICH_EMPHASIS = /(?:\*\*[^*]+\*\*|\*[^*]+\*)/;

export const requiresIdentifiedContext = (prompt: string): boolean => CONTEXT_REFERENCE.test(prompt);
export const requiresVisualEmphasis = (prompt: string): boolean => VISUAL_REFERENCE.test(prompt);
export const containsRichEmphasis = (...values: Array<string | undefined | null>): boolean =>
  RICH_EMPHASIS.test(values.filter(Boolean).join('\n'));
