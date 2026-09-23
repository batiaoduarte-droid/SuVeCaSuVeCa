export interface SavedTipEntry { saved: boolean; updatedAt: number }
export interface SavedTipsState { schemaVersion: 1; entries: Record<string, SavedTipEntry> }
export const emptySavedTips = (): SavedTipsState => ({ schemaVersion: 1, entries: {} });
export const savedTipsKey = (uid?: string) => `suveca_saved_tips_v1_${uid || 'guest'}`;

export function normalizeSavedTips(value: unknown): SavedTipsState {
  const result = emptySavedTips();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  const legacyTips = (value as { tips?: unknown }).tips;
  if (Array.isArray(legacyTips)) {
    for (const tip of legacyTips) if (tip && typeof tip.id === 'string' && tip.id && !['__proto__', 'constructor', 'prototype'].includes(tip.id)) {
      result.entries[tip.id] = { saved: true, updatedAt: Math.max(0, Date.parse(tip.savedAt) || 0) };
    }
    return result;
  }
  const candidate = value as Partial<SavedTipsState>;
  if (candidate.schemaVersion !== 1 || !candidate.entries || typeof candidate.entries !== 'object') return result;
  for (const [id, entry] of Object.entries(candidate.entries)) {
    if (id && !['__proto__', 'constructor', 'prototype'].includes(id) && entry
      && typeof entry.saved === 'boolean' && Number.isSafeInteger(entry.updatedAt) && entry.updatedAt >= 0) {
      result.entries[id] = { saved: entry.saved, updatedAt: entry.updatedAt };
    }
  }
  return result;
}

/** Keep removal records: merging a stale device must not restore deleted favorites. */
export function mergeSavedTips(...states: SavedTipsState[]): SavedTipsState {
  const result = emptySavedTips();
  for (const state of states) for (const [id, entry] of Object.entries(state.entries)) {
    const previous = result.entries[id];
    if (!previous || entry.updatedAt > previous.updatedAt || (entry.updatedAt === previous.updatedAt && !entry.saved)) {
      result.entries[id] = { ...entry };
    }
  }
  return result;
}

export function readSavedTips(uid?: string): SavedTipsState {
  try {
    const current = localStorage.getItem(savedTipsKey(uid));
    if (current) return normalizeSavedTips(JSON.parse(current));
    const aiStudioLegacy = localStorage.getItem(`suveca_saved_tips_${uid || 'guest'}`);
    if (aiStudioLegacy) return normalizeSavedTips({ tips: JSON.parse(aiStudioLegacy) });
    // The shared legacy key belongs only to the guest; never import it into an account.
    const legacy = JSON.parse(localStorage.getItem(uid ? `suveca_favorite_tips_${uid}` : 'suveca_favorite_tips') || '[]');
    const state = emptySavedTips();
    if (Array.isArray(legacy)) for (const id of legacy) {
      if (typeof id === 'string' && id && !['__proto__', 'constructor', 'prototype'].includes(id)) state.entries[id] = { saved: true, updatedAt: 0 };
    }
    return state;
  } catch { return emptySavedTips(); }
}
