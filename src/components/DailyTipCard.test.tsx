import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyTipCard } from './DailyTipCard';
import { SavedTipsView } from './SavedTipsView';
import { DAILY_TIPS, getDailyTip } from '../data/dailyTips';
import { mergeSavedTips, normalizeSavedTips, readSavedTips, savedTipsKey } from '../lib/savedTips';
const mocks = vi.hoisted(() => ({ get: vi.fn(), transaction: vi.fn(), user: { currentUser: null as null | { uid: string } } }));
vi.mock('../lib/firebase', () => ({ auth: mocks.user, db: {}, isLocalAuthActive: () => false }));
vi.mock('firebase/firestore', () => ({ doc: (...parts: unknown[]) => parts.slice(1).join('/'), getDoc: mocks.get, runTransaction: mocks.transaction }));
beforeEach(() => { localStorage.clear(); mocks.user.currentUser = null; mocks.get.mockReset(); mocks.transaction.mockReset(); });

describe('saved tips', () => {
  it('preserves guest favorites without importing them into another account', async () => {
    localStorage.setItem('suveca_favorite_tips', JSON.stringify([getDailyTip().id]));
    const view = render(<DailyTipCard />);
    expect(screen.getByLabelText('Remover dica dos favoritos')).toBeInTheDocument();
    view.rerender(<DailyTipCard userId="alice" />);
    expect(screen.getByLabelText('Salvar dica como favorita')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Salvar dica como favorita'));
    expect(readSavedTips('alice').entries[getDailyTip().id].saved).toBe(true);
    view.rerender(<DailyTipCard userId="bob" />);
    expect(screen.getByLabelText('Salvar dica como favorita')).toBeInTheDocument();
    expect(localStorage.getItem('suveca_favorite_tips')).not.toBeNull();
  });
  it('keeps removals when an older snapshot is merged and validates malformed storage', () => {
    const old = normalizeSavedTips({ schemaVersion: 1, entries: { a: { saved: true, updatedAt: 1 } } });
    const removed = normalizeSavedTips({ schemaVersion: 1, entries: { a: { saved: false, updatedAt: 2 } } });
    expect(mergeSavedTips(removed, old).entries.a.saved).toBe(false);
    localStorage.setItem(savedTipsKey(), '{broken'); expect(readSavedTips().entries).toEqual({});
    expect(normalizeSavedTips({ tips: [{ id: 'from-studio', savedAt: '2026-01-01' }] }).entries['from-studio'].saved).toBe(true);
  });
  it('keeps the current account isolated from late cloud hydration', async () => {
    let resolve!: (value: unknown) => void;
    mocks.user.currentUser = { uid: 'alice' };
    mocks.get.mockReturnValue(new Promise(done => { resolve = done; }));
    const view = render(<DailyTipCard userId="alice" />);
    mocks.user.currentUser = null; view.rerender(<DailyTipCard userId="bob" />);
    await act(async () => resolve({ data: () => ({ tips: [{ id: getDailyTip().id }] }) }));
    expect(screen.getByLabelText('Salvar dica como favorita')).toBeInTheDocument();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it('reports failed cloud sync while retaining the local favorite', async () => {
    mocks.user.currentUser = { uid: 'alice' };
    mocks.get.mockResolvedValue({ data: () => undefined }); mocks.transaction.mockRejectedValue(new Error('offline'));
    render(<DailyTipCard userId="alice" />);
    await userEvent.click(screen.getByLabelText('Salvar dica como favorita'));
    await waitFor(() => expect(screen.getByText(/Sincronização pendente/)).toBeInTheDocument());
    expect(readSavedTips('alice').entries[getDailyTip().id].saved).toBe(true);
  });
  it('searches saved editorial content and removes the selected record', async () => {
    const remove = vi.fn(); const tip = DAILY_TIPS[0];
    render(<SavedTipsView tips={[tip]} onRemove={remove} />);
    await userEvent.type(screen.getByRole('searchbox'), 'zzzinexistente');
    expect(screen.queryByRole('heading', { name: tip.rule })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByRole('searchbox'));
    await userEvent.click(screen.getByRole('button', { name: `Remover dica: ${tip.rule}` }));
    expect(remove).toHaveBeenCalledWith(tip.id);
  });
});
