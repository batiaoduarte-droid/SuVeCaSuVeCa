import { describe, expect, it } from 'vitest';
import type { PBLSession } from '../../../types/pbl';
import {
  accumulatePBLSessionTiming,
  createPBLTimingCursor,
  currentPBLWallTimeMs,
  hydratePBLSessionTiming,
} from '../session/PBLSessionTiming';

const makeSession = (overrides: Partial<PBLSession> = {}): PBLSession => ({
  sessionId: 'session-timing',
  userId: 'guest',
  mode: 'guided',
  status: 'active',
  startedAt: '2026-08-26T12:00:00.000Z',
  updatedAt: '2026-08-26T12:00:00.000Z',
  targetCompetencyRefs: ['COMP-1'],
  currentCompetencyIndex: 0,
  currentCompetencyRef: 'COMP-1',
  currentCaseRef: 'CASE-1',
  currentQuestionRef: 'QUESTION-1',
  phase: 'problem',
  currentTransferItemIndex: 0,
  attempts: [],
  masterySnapshot: {},
  sessionStats: {
    initialAccuracy: 0,
    postInterventionAccuracy: 0,
    transferRate: 0,
    misconceptionsCaught: 0,
    totalTimeMs: 0,
  },
  ...overrides,
});

describe('PBLSessionTiming', () => {
  it('acumula tempo de parede e atribui o intervalo à fase anterior', () => {
    const initial = hydratePBLSessionTiming(makeSession());
    const cursor = createPBLTimingCursor(initial, 1_000);
    const next = { ...initial, phase: 'diagnostic' as const };

    const measured = accumulatePBLSessionTiming(next, cursor, 6_000);

    expect(measured.session.wallTimeMs).toBe(5_000);
    expect(measured.session.phaseTimings).toEqual({ problem: 5_000 });
    expect(measured.cursor.phase).toBe('diagnostic');
  });

  it('não conta o intervalo em que a sessão está pausada', () => {
    const initial = hydratePBLSessionTiming(makeSession());
    const cursor = createPBLTimingCursor(initial, 1_000);
    const paused = accumulatePBLSessionTiming(initial, cursor, 3_000, false);
    const whilePaused = accumulatePBLSessionTiming(
      paused.session,
      paused.cursor,
      30_000,
      false
    );

    expect(whilePaused.session.wallTimeMs).toBe(2_000);
    expect(whilePaused.session.phaseTimings?.problem).toBe(2_000);
  });

  it('hidrata sessão legada com o tempo de resposta sem duplicá-lo', () => {
    const legacy = makeSession({
      attempts: [{ attemptId: 'legacy' } as PBLSession['attempts'][number]],
      sessionStats: {
        initialAccuracy: 100,
        postInterventionAccuracy: 0,
        transferRate: 0,
        misconceptionsCaught: 0,
        totalTimeMs: 4_000,
      },
    });
    const hydrated = hydratePBLSessionTiming(legacy);
    const cursor = createPBLTimingCursor(hydrated, 10_000);

    expect(currentPBLWallTimeMs(hydrated, cursor, 11_500)).toBe(5_500);
  });
});
