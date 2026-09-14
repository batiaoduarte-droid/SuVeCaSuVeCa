import type { User, IdTokenResult } from 'firebase/auth';

export const LOCAL_DEV_TOKEN = 'local-dev-token';
export const LOCAL_TEST_USER_ID = 'local-test-user';
export const LOCAL_AUTH_STORAGE_KEY = 'suveca_local_dev_auth_enabled';

export const LOCAL_TEST_USER: User = {
  uid: LOCAL_TEST_USER_ID,
  displayName: 'Eu (Usuário Local)',
  email: 'eu@suveca.local',
  photoURL: '',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toUTCString(),
    lastSignInTime: new Date().toUTCString(),
  },
  providerData: [
    {
      uid: LOCAL_TEST_USER_ID,
      displayName: 'Eu (Usuário Local)',
      email: 'eu@suveca.local',
      phoneNumber: null,
      photoURL: '',
      providerId: 'custom',
    },
  ],
  refreshToken: 'local-refresh-token',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => LOCAL_DEV_TOKEN,
  getIdTokenResult: async () =>
    ({
      token: LOCAL_DEV_TOKEN,
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 86400000).toISOString(),
      signInProvider: 'custom',
      claims: { uid: LOCAL_TEST_USER_ID },
    } as unknown as IdTokenResult),
  reload: async () => {},
  toJSON: () => ({ uid: LOCAL_TEST_USER_ID, email: 'eu@suveca.local' }),
  phoneNumber: null,
  providerId: 'custom',
};

export function isLocalAuthActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) === 'true';
}

export function setLocalAuthActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, 'true');
  } else {
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent('suveca:local-auth-change', { detail: { active } }));
}

export function toggleLocalAuth(): boolean {
  const next = !isLocalAuthActive();
  setLocalAuthActive(next);
  return next;
}
