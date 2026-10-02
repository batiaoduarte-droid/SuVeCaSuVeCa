import { beforeEach, describe, expect, it, vi } from 'vitest';
import { confirmStudyAttempt, exportStudy, readStudyItem, restartStudyAttempt, saveStudyItem } from './exampleStudyStore';
import type { ExampleStudyItem } from '../types/pedagogicalView';
const item: ExampleStudyItem = { id: 'group', kind: 'question', title: 'Questão', aliases: [{ exampleId: 'old', itemId: 'A' }], sourceRefs: [], contentRefs: [], options: [{ id: 'C', text: 'Certo' }, { id: 'E', text: 'Errado' }], grading: { available: true, answerId: 'E' } };
beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
describe('example study persistence', () => {
  it('requires explicit confidence and preserves independent attempts and exposure', () => {
    let state = readStudyItem('u', 'unit', item, 'r1');
    state.draft.answer = 'C';
    expect(() => confirmStudyAttempt(state, item)).toThrow();
    state.draft.confidence = 'low'; state.exposed = true; state.exposureThisAttempt = true;
    state = confirmStudyAttempt(state, item);
    expect(state.attempts[0]).toMatchObject({ result: 'incorrect', assistance: 'full' });
    expect(confirmStudyAttempt(state, item).attempts).toHaveLength(1);
    saveStudyItem('u', item.id, state);
    expect(readStudyItem('other', 'unit', item, 'r1').attempts).toEqual([]);
    const next = restartStudyAttempt(readStudyItem('u', 'unit', item, 'r1'));
    expect(next).toMatchObject({ exposed: true, visible: false, exposureThisAttempt: false, draft: { confidence: null, answer: '' } });
    next.draft.answer = 'E'; next.draft.confidence = 'high';
    expect(confirmStudyAttempt(next, item).attempts[1]).toMatchObject({ result: 'correct', assistance: 'none' });
  });
  it('migrates once, retains legacy source and never infers confidence or result', () => {
    const events = [{ id: 'e1', unitId: 'unit', exampleId: 'old', itemId: 'A', kind: 'attempt', reflection: 'Meu texto', createdAt: '2026-09-29T00:00:00Z' }];
    localStorage.setItem('suveca_example_study_v1_u', JSON.stringify(events));
    const state = readStudyItem('u', 'unit', item, 'r1'); saveStudyItem('u', item.id, state);
    const again = readStudyItem('u', 'unit', item, 'r1'); saveStudyItem('u', item.id, again);
    expect(again.attempts).toHaveLength(1);
    expect(again.attempts[0]).toMatchObject({ id: 'e1', reasoning: 'Meu texto', confidence: null, result: 'ungraded', assistance: 'unknown' });
    expect(JSON.parse(exportStudy('u', 'unit')).legacy).toEqual(events);
    expect(localStorage.getItem('suveca_example_study_v1_u')).toEqual(JSON.stringify(events));
  });
  it('preserves history over content revisions and storage errors do not overwrite data', () => {
    const state = readStudyItem('u', 'unit', item, 'r1'); state.draft.answer = 'C'; state.draft.confidence = 'high';
    saveStudyItem('u', item.id, confirmStudyAttempt(state, item));
    expect(readStudyItem('u', 'unit', item, 'r2')).toMatchObject({ revision: 'r2', confirmed: false, visible: false, draft: { confidence: null } });
    expect(readStudyItem('u', 'unit', item, 'r2').attempts).toHaveLength(1);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError'); });
    expect(() => saveStudyItem('u', item.id, state)).toThrow();
    expect(readStudyItem('u', 'unit', item, 'r1').confirmed).toBe(true);
  });
  it('does not infer grading for open responses or multiply ambiguous parent events', () => {
    const open = { ...item, grading: { available: false } };
    const state = readStudyItem(undefined, 'unit', open, 'r1'); state.draft.answer = 'Uma reflexão';
    expect(confirmStudyAttempt(state, open).attempts[0]).toMatchObject({ result: 'ungraded', confidence: null });
    localStorage.setItem('suveca_example_study_v1_guest', JSON.stringify([{ id: 'old', unitId: 'unit', exampleId: 'old', kind: 'attempt', createdAt: '2026-09-29T00:00:00Z' }]));
    expect(readStudyItem(undefined, 'unit', { ...item, id: 'old:case1' }, 'r1').attempts).toEqual([]);
  });
});
