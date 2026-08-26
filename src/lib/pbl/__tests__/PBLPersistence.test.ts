import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PBLSessionRepository } from '../persistence/PBLSessionRepository';
import type { PBLSession, CompetencyMastery } from '../../../types/pbl';

describe('PBLSessionRepository Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockSession: PBLSession = {
    sessionId: 'sess_pers_001',
    userId: 'guest',
    mode: 'guided',
    status: 'active',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    targetCompetencyRefs: ['COMP-A10-G01-01'],
    currentCompetencyIndex: 0,
    currentCompetencyRef: 'COMP-A10-G01-01',
    currentCaseRef: 'PBL-CASE-A10-G01-01',
    currentQuestionRef: 'OQ-A10-aula10.q0001',
    phase: 'problem',
    currentTransferItemIndex: 0,
    attempts: [],
    masterySnapshot: {
      'COMP-A10-G01-01': {
        competencyId: 'COMP-A10-G01-01',
        unitId: 'IP-A10-G01',
        lessonId: 'A10',
        score: 0.65,
        level: 'competent',
        totalAttempts: 3,
        correctAttempts: 2,
        transferSuccessCount: 1,
        activeMisconceptions: [],
        resolvedMisconceptions: [],
        lastPracticedAt: new Date().toISOString(),
        nextReviewRecommendedAt: new Date().toISOString(),
      },
    },
    sessionStats: {
      initialAccuracy: 100,
      postInterventionAccuracy: 0,
      transferRate: 100,
      misconceptionsCaught: 0,
      totalTimeMs: 45000,
    },
  };

  it('should save and retrieve session for guest user from LocalStorage', async () => {
    await PBLSessionRepository.saveSession(mockSession);
    const retrieved = await PBLSessionRepository.getSession('sess_pers_001', 'guest');

    expect(retrieved).toBeDefined();
    expect(retrieved?.sessionId).toBe('sess_pers_001');
    expect(retrieved?.masterySnapshot['COMP-A10-G01-01'].score).toBe(0.65);
    expect(retrieved?.masterySnapshot['COMP-A10-G01-01'].learningState).toBe('acquiring');
  });

  it('does not infer transfer or retention from a legacy score label alone', async () => {
    const legacyMastery = mockSession.masterySnapshot['COMP-A10-G01-01'];
    await PBLSessionRepository.saveSession({
      ...mockSession,
      masterySnapshot: {
        'COMP-A10-G01-01': {
          ...legacyMastery,
          score: 0.95,
          level: 'expert',
          learningState: undefined,
          immediateTransferConfirmedAt: undefined,
          retentionConfirmedAt: undefined,
        },
      },
    });

    const retrieved = await PBLSessionRepository.getSession(mockSession.sessionId, 'guest');
    expect(retrieved?.masterySnapshot['COMP-A10-G01-01'].learningState).toBe('acquiring');
  });

  it('should retrieve user mastery correctly', async () => {
    await PBLSessionRepository.saveSession(mockSession);
    const masteries = await PBLSessionRepository.getUserMastery('guest');

    expect(masteries['COMP-A10-G01-01']).toBeDefined();
    expect(masteries['COMP-A10-G01-01'].score).toBe(0.65);
  });

  it('should fallback to LocalStorage seamlessly if remote sync encounters error', async () => {
    const authSession: PBLSession = {
      ...mockSession,
      sessionId: 'sess_auth_002',
      userId: 'user_real_999',
    };

    // Even if db / Firestore is unreachable or throws
    await expect(PBLSessionRepository.saveSession(authSession)).resolves.not.toThrow();

    const localSaved = localStorage.getItem('suveca_pbl_session_sess_auth_002');
    expect(localSaved).toBeDefined();
    expect(JSON.parse(localSaved!).userId).toBe('user_real_999');
  });

  it('should retrieve the latest active session and ignore completed sessions', async () => {
    await PBLSessionRepository.saveSession({ ...mockSession, sessionId: 'older', updatedAt: '2026-01-01T00:00:00.000Z' });
    await PBLSessionRepository.saveSession({ ...mockSession, sessionId: 'newer', updatedAt: '2026-02-01T00:00:00.000Z' });
    await PBLSessionRepository.saveSession({ ...mockSession, sessionId: 'completed', status: 'completed', updatedAt: '2026-03-01T00:00:00.000Z' });

    const active = await PBLSessionRepository.getLatestActiveSession('guest');
    expect(active?.sessionId).toBe('newer');
  });

  it('should mark an abandoned session so it is not offered for resume', async () => {
    const abandoned = { ...mockSession, sessionId: 'to_abandon' };
    await PBLSessionRepository.abandonSession(abandoned);
    expect((await PBLSessionRepository.getSession('to_abandon'))?.status).toBe('abandoned');
  });
});
