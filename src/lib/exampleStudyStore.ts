import type { ExampleStudyItem } from '../types/pedagogicalView';
import { readExampleStudy, type ExampleStudyEvent } from './exampleStudy';

export type StudyConfidence = 'guess' | 'low' | 'medium' | 'high';
export interface StudyDraft { answer: string; reasoning: string; confidence: StudyConfidence | null }
export interface StudyAttempt extends StudyDraft {
  id: string; createdAt: string; revision: string;
  result: 'correct' | 'incorrect' | 'ungraded';
  assistance: 'none' | 'full' | 'unknown';
  confidenceSource: 'explicit' | 'legacy_unknown';
}
export interface StudyItemState {
  unitId: string; revision: string; draft: StudyDraft; attempts: StudyAttempt[];
  visible: boolean; exposed: boolean; exposureThisAttempt: boolean;
  exposureUnknown: boolean; confirmed: boolean;
}
interface StudyStore { version: 2; legacy: ExampleStudyEvent[]; items: Record<string, StudyItemState> }
export const exampleStudyKey = (uid?: string) => `suveca_example_study_v2_${uid || 'guest'}`;
export const emptyStudyDraft = (): StudyDraft => ({ answer: '', reasoning: '', confidence: null });
function load(uid?: string): StudyStore {
  const raw = localStorage.getItem(exampleStudyKey(uid));
  if (!raw) return { version: 2, legacy: readExampleStudy(uid), items: {} };
  const value = JSON.parse(raw);
  if (value?.version !== 2 || !value.items || !Array.isArray(value.legacy)) throw new Error('Invalid study storage');
  return value;
}
export function readStudyItem(uid: string | undefined, unitId: string, item: ExampleStudyItem, revision: string): StudyItemState {
  const store = load(uid);
  const previous = store.items[item.id];
  if (previous) return previous.revision === revision ? previous : {
    ...previous, revision, draft: emptyStudyDraft(), confirmed: false, visible: false, exposureThisAttempt: false,
  };
  // Ambiguous old parent events are retained in the export, not multiplied across split children.
  const legacy = item.id.includes(':case') || item.id.includes(':gap') || item.id.includes(':q') ? [] : store.legacy.filter(e =>
    e.unitId === unitId && item.aliases.some(a => a.exampleId === e.exampleId && a.itemId === e.itemId));
  const exposed = legacy.some(e => e.kind === 'reveal');
  return { unitId, revision, draft: emptyStudyDraft(), visible: false, exposed,
    exposureThisAttempt: false, exposureUnknown: store.legacy.length > 0, confirmed: false,
    attempts: legacy.filter(e => e.kind === 'attempt').map(e => ({ id: e.id, createdAt: e.createdAt,
      answer: '', reasoning: e.reflection || '', confidence: null, confidenceSource: 'legacy_unknown',
      revision: 'legacy-v1', result: 'ungraded', assistance: 'unknown' })) };
}
export function saveStudyItem(uid: string | undefined, id: string, state: StudyItemState): void {
  const store = load(uid);
  store.items[id] = state;
  localStorage.setItem(exampleStudyKey(uid), JSON.stringify(store));
}
export function confirmStudyAttempt(state: StudyItemState, item: ExampleStudyItem): StudyItemState {
  if (state.confirmed) return state;
  if (!state.draft.answer.trim() || (item.grading.available && !state.draft.confidence)) throw new Error('Incomplete attempt');
  if (item.grading.available && !item.options?.some(o => o.id === state.draft.answer)) throw new Error('Invalid answer');
  const attempt: StudyAttempt = { ...state.draft, id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    revision: state.revision, result: item.grading.available ? state.draft.answer === item.grading.answerId ? 'correct' : 'incorrect' : 'ungraded',
    assistance: state.exposureThisAttempt ? 'full' : state.exposureUnknown ? 'unknown' : 'none', confidenceSource: 'explicit' };
  return { ...state, confirmed: true, visible: true, exposed: true, attempts: [...state.attempts, attempt] };
}
export function restartStudyAttempt(state: StudyItemState): StudyItemState {
  return { ...state, draft: emptyStudyDraft(), confirmed: false, visible: false, exposureThisAttempt: false };
}
export function exportStudy(uid: string | undefined, unitId: string): string {
  const store = load(uid);
  return JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), unitId,
    items: Object.fromEntries(Object.entries(store.items).filter(([, s]) => s.unitId === unitId)),
    legacy: store.legacy.filter(e => e.unitId === unitId) }, null, 2);
}
