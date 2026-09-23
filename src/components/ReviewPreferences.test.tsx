import { act, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyReviewReminder } from './DailyReviewReminder';
import { StudyPreferences } from './StudyPreferences';
import { announceStudyMode, readStudyMode, studyPreferencesKey, useStudyMode } from '../lib/studyMode';
import { getTokenDocumentId, supportsPushNotifications } from '../lib/pushNotifications';
const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock('../lib/firebase', () => ({ auth: { currentUser: null }, db: {}, firebaseApp: {}, isLocalAuthActive: () => false, safeSetDoc: mocks.save }));
vi.mock('firebase/firestore', () => ({ doc: (_db: unknown, ...parts: string[]) => parts.join('/'), getDoc: mocks.get, deleteDoc: vi.fn() }));
vi.mock('./PushNotificationSettings', () => ({ PushNotificationSettings: () => null }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); mocks.get.mockResolvedValue({ exists: () => false, data: () => ({}) }); mocks.save.mockResolvedValue(undefined); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('review preferences', () => {
  it('does not undo a mode restored while cloud settings are loading', async () => {
    let resolve!: (value: unknown) => void;
    const response = new Promise(done => { resolve = done; });
    mocks.get.mockReturnValue(response);
    localStorage.setItem(studyPreferencesKey('alice'), JSON.stringify({ studyMode: 'pbl_only' }));
    render(<StudyPreferences user={{ uid: 'alice' } as any} />);
    localStorage.setItem(studyPreferencesKey('alice'), JSON.stringify({ studyMode: 'complete' }));
    act(() => announceStudyMode('complete', 'alice'));
    await act(async () => resolve({ exists: () => true, data: () => ({ studyMode: 'pbl_only' }) }));
    await waitFor(() => expect(readStudyMode('alice')).toBe('complete'));
  });
  it('changes navigation only for the correct account and preserves unrelated preferences', () => {
    localStorage.setItem(studyPreferencesKey('alice'), JSON.stringify({ studyMode: 'pbl_only', reminderTime: '11:00' }));
    const hook = renderHook(({ uid }) => useStudyMode(uid), { initialProps: { uid: 'alice' } });
    expect(hook.result.current[0]).toBe('pbl_only');
    act(() => announceStudyMode('complete', 'bob'));
    expect(hook.result.current[0]).toBe('pbl_only');
    act(() => hook.result.current[1]());
    expect(readStudyMode('alice')).toBe('complete');
    expect(JSON.parse(localStorage.getItem(studyPreferencesKey('alice'))!).reminderTime).toBe('11:00');
    hook.rerender({ uid: 'bob' }); expect(hook.result.current[0]).toBe('complete');
  });
  it('delivers at most once per local day while mounted and after remount', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 23, 12));
    const notify = vi.fn();
    vi.stubGlobal('Notification', class { static permission = 'granted'; constructor(...args: unknown[]) { notify(...args); } });
    localStorage.setItem('suveca_daily_review_reminder_guest', JSON.stringify({ enabled: true, reminderTime: '09:00' }));
    const errors = [{ id: 'a', status: 'dia0' }] as any;
    const view = render(<DailyReviewReminder errors={errors} hidden />);
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    expect(notify).toHaveBeenCalledTimes(1);
    view.unmount(); render(<DailyReviewReminder errors={errors} hidden />);
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(notify).toHaveBeenCalledTimes(1);
  });
  it('ignores stale cloud preferences after changing accounts', async () => {
    let resolve!: (value: unknown) => void;
    mocks.get.mockImplementation((path: string) => path.includes('/alice/') ? new Promise(done => { resolve = done; }) : Promise.resolve({ exists: () => false, data: () => ({}) }));
    const view = render(<DailyReviewReminder errors={[]} userId="alice" />);
    view.rerender(<DailyReviewReminder errors={[]} userId="bob" />);
    await act(async () => resolve({ exists: () => true, data: () => ({ enabled: true, reminderTime: '01:00' }) }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('suveca_daily_review_reminder_bob')!).enabled).toBe(false));
  });
  it('stores push identifiers without exposing the token and requires a secure browser', async () => {
    const first = await getTokenDocumentId('token-a');
    expect(first).toBe(await getTokenDocumentId('token-a'));
    expect(first).not.toBe(await getTokenDocumentId('token-b'));
    expect(first).not.toContain('token-a');
    vi.stubGlobal('isSecureContext', false);
    expect(supportsPushNotifications()).toBe(false);
  });
});
