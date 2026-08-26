import type { PBLSession, PBLSessionPhase } from '../../../types/pbl';

export interface PBLTimingCursor {
  phase: PBLSessionPhase;
  segmentStartedAtMs: number;
  running: boolean;
}

const shouldRun = (session: PBLSession): boolean =>
  session.status === 'active' && session.phase !== 'completed';

/**
 * Sessões anteriores ao wall-clock preservam ao menos o tempo de resposta já
 * conhecido. Sessões novas começam em zero e não somam o response time duas vezes.
 */
export const hydratePBLSessionTiming = (session: PBLSession): PBLSession => ({
  ...session,
  wallTimeMs: Number.isFinite(session.wallTimeMs)
    ? Math.max(0, Number(session.wallTimeMs))
    : session.attempts.length
      ? Math.max(0, session.sessionStats.totalTimeMs)
      : 0,
  phaseTimings: { ...(session.phaseTimings || {}) },
});

export const createPBLTimingCursor = (
  session: PBLSession,
  nowMs: number = Date.now()
): PBLTimingCursor => ({
  phase: session.phase,
  segmentStartedAtMs: nowMs,
  running: shouldRun(session),
});

export const accumulatePBLSessionTiming = (
  session: PBLSession,
  cursor: PBLTimingCursor,
  nowMs: number = Date.now(),
  continueRunning: boolean = shouldRun(session)
): { session: PBLSession; cursor: PBLTimingCursor } => {
  const elapsed = cursor.running
    ? Math.max(0, nowMs - cursor.segmentStartedAtMs)
    : 0;
  const phaseTimings = { ...(session.phaseTimings || {}) };

  if (elapsed > 0) {
    phaseTimings[cursor.phase] = Math.max(0, phaseTimings[cursor.phase] || 0) + elapsed;
  }

  return {
    session: {
      ...session,
      wallTimeMs: Math.max(0, session.wallTimeMs || 0) + elapsed,
      phaseTimings,
    },
    cursor: {
      phase: session.phase,
      segmentStartedAtMs: nowMs,
      running: continueRunning && shouldRun(session),
    },
  };
};

export const currentPBLWallTimeMs = (
  session: PBLSession,
  cursor: PBLTimingCursor,
  nowMs: number = Date.now()
): number => (
  Math.max(0, session.wallTimeMs || 0)
  + (cursor.running ? Math.max(0, nowMs - cursor.segmentStartedAtMs) : 0)
);
