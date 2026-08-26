import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PBLSession } from '../../types/pbl';
import { PBLSessionView } from './PBLSessionView';

const mocks = vi.hoisted(() => ({
  completeReflection: vi.fn((session: PBLSession, reflection: Record<string, unknown>) => ({
    ...session,
    status: 'completed' as const,
    phase: 'completed' as const,
    reflectionEntries: {
      'COMP-1': {
        decision: reflection.decision,
        note: reflection.note,
        suggestedRule: reflection.suggestedRule,
        assistanceUsed: reflection.assistanceUsed,
        revealedSuggestedRule: reflection.revealedSuggestedRule,
        createdAt: '2026-08-26T12:01:00.000Z',
      },
    },
  })),
  saveSession: vi.fn(async () => ({ syncedRemotely: false })),
  saveSessionLocally: vi.fn(),
}));

vi.mock('../../lib/pbl/engine/PBLEngine', () => ({
  pblEngine: {
    caseSelector: { selectAnchorCase: vi.fn(async () => null) },
    repo: {
      getCompetency: vi.fn(async () => ({ title: 'Identificar o sujeito' })),
      getQuestionPresentation: vi.fn(async () => null),
      getRulePresentation: vi.fn(async () => null),
    },
    completeReflection: mocks.completeReflection,
  },
}));

vi.mock('../../lib/pbl/persistence/PBLSessionRepository', () => ({
  PBLSessionRepository: {
    saveSession: mocks.saveSession,
    saveSessionLocally: mocks.saveSessionLocally,
    abandonSession: vi.fn(async () => undefined),
  },
}));

const session: PBLSession = {
  sessionId: 'reflection-session',
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
  phase: 'reflection',
  currentTransferItemIndex: 0,
  attempts: [],
  masterySnapshot: {},
  pendingNextAction: {
    type: 'complete_session',
    reason: 'Ciclo imediato concluído.',
    feedbackMessage: 'A aplicação imediata foi concluída.',
    outcome: 'transfer_confirmed',
  },
  lastInterventionPayload: {
    interventionId: 'INT-1',
    competencyRef: 'COMP-1',
    microLessonText: 'Localize o núcleo do sujeito.',
    ruleTitle: 'Teste decisivo',
    ruleStatement: 'Localize o verbo e pergunte quem realiza a ação.',
    procedureSteps: [],
  },
  sessionStats: {
    initialAccuracy: 100,
    postInterventionAccuracy: 0,
    transferRate: 100,
    misconceptionsCaught: 0,
    totalTimeMs: 4_000,
  },
};

describe('PBLSessionView reflection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exige recuperação antes de revelar a regra e marca adoção assistida', async () => {
    const user = userEvent.setup();
    render(<PBLSessionView initialSession={session} onExit={vi.fn()} />);

    expect(screen.queryByText(/Localize o verbo e pergunte quem realiza/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /comparar com a orientação/i })).toBeDisabled();

    await user.type(
      screen.getByRole('textbox', { name: /sem consultar a orientação/i }),
      'vou localizar o verbo e testar o sujeito'
    );
    await user.click(screen.getByRole('button', { name: /comparar com a orientação/i }));

    expect(screen.getByText(/Localize o verbo e pergunte quem realiza/)).toBeInTheDocument();
    await user.click(screen.getByText('Adotar a orientação'));
    await user.click(screen.getByRole('button', { name: /salvar decisão/i }));

    await waitFor(() => expect(mocks.completeReflection).toHaveBeenCalled());
    expect(mocks.completeReflection.mock.calls[0][1]).toEqual(expect.objectContaining({
      decision: 'suggested_rule',
      assistanceUsed: true,
      revealedSuggestedRule: true,
    }));
  });
});
