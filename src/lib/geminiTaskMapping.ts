// Preserve the main branch model policy; do not infer capabilities from client task names.
const TEXT_MODELS = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
export const GEMINI_TASKS = {
  analyze: { model: 'gemini-3.1-flash-lite', capability: 'text' },
  explain: { model: 'gemini-3.1-flash-lite', capability: 'text' },
  questions: { model: 'gemini-3.8-flash', capability: 'text' },
  flashcards: { model: 'gemini-3.5-flash-lite', capability: 'text' },
  feynman: { model: 'gemini-3.5-flash-lite', capability: 'text' },
  tts: { model: 'gemini-3.1-flash-tts-preview', capability: 'tts' },
  live: { model: 'gemini-3.1-flash-live-preview', capability: 'live' },
} as const;
export type GeminiTask = keyof typeof GEMINI_TASKS;
export function resolveModelForTask(task: GeminiTask, override?: unknown): string {
  const config = GEMINI_TASKS[task];
  const allowed = config.capability === 'text' ? TEXT_MODELS : [config.model];
  return typeof override === 'string' && allowed.includes(override) ? override : config.model;
}
