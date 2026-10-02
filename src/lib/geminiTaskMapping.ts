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
export const PROFESSOR_MODELS = [
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-lite' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-lite' },
  { id: 'antigravity-preview-09-2026', label: 'Antigravity (Agente 3.8 Flash)' },
] as const;
export type ProfessorModel = typeof PROFESSOR_MODELS[number]['id'];
export function isProfessorModel(model: unknown): model is ProfessorModel {
  return PROFESSOR_MODELS.some(option => option.id === model);
}
export const PROFESSOR_MAX_ATTEMPTS = 12;
export function professorTimeoutMs(model: unknown) {
  return model === 'antigravity-preview-09-2026' ? 180_000 : 90_000;
}
export function professorModelLabel(model: unknown) {
  return PROFESSOR_MODELS.find(option => option.id === model)?.label || PROFESSOR_MODELS[0].label;
}
export function resolveModelForTask(task: GeminiTask, override?: unknown): string {
  const config = GEMINI_TASKS[task];
  const allowed = config.capability === 'text' ? TEXT_MODELS : [config.model];
  return typeof override === 'string' && allowed.includes(override) ? override : config.model;
}
