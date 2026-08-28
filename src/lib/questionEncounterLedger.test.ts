import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRecentQuestionEncounterRefs,
  readQuestionEncounters,
  recordQuestionEncounter,
} from './questionEncounterLedger';

describe('questionEncounterLedger', () => {
  beforeEach(() => localStorage.clear());

  it('compacta atualizações do mesmo encontro sem duplicar a sessão', () => {
    recordQuestionEncounter('learner', {
      questionId: 'OQ-A00-q1',
      purpose: 'diagnostic',
      encounteredAt: '2026-08-27T10:00:00.000Z',
      sessionId: 'session-1',
    });
    recordQuestionEncounter('learner', {
      questionId: 'OQ-A00-q1',
      purpose: 'diagnostic',
      encounteredAt: '2026-08-27T10:01:00.000Z',
      correct: true,
      confidence: 0.9,
      sessionId: 'session-1',
    });

    expect(readQuestionEncounters('learner')).toEqual([expect.objectContaining({
      questionId: 'OQ-A00-q1',
      correct: true,
      confidence: 0.9,
    })]);
  });

  it('retorna somente exposições recentes e pode ignorar a sessão corrente', () => {
    recordQuestionEncounter('learner', {
      questionId: 'Q-RECENT',
      purpose: 'acquisition_practice',
      encounteredAt: '2026-08-26T10:00:00.000Z',
    });
    recordQuestionEncounter('learner', {
      questionId: 'Q-CURRENT',
      purpose: 'transfer',
      encounteredAt: '2026-08-27T09:00:00.000Z',
      sessionId: 'session-current',
    });
    recordQuestionEncounter('learner', {
      questionId: 'Q-OLD',
      purpose: 'example',
      encounteredAt: '2026-07-01T09:00:00.000Z',
    });

    expect(getRecentQuestionEncounterRefs('learner', {
      now: Date.parse('2026-08-27T10:00:00.000Z'),
      withinMs: 14 * 24 * 60 * 60 * 1000,
      excludeSessionId: 'session-current',
    })).toEqual(['Q-RECENT']);
  });
});
