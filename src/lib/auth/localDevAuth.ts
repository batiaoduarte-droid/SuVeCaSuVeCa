import type { User, IdTokenResult } from 'firebase/auth';

export const LOCAL_DEV_TOKEN = 'local-dev-token';
export const LOCAL_TEST_USER_ID = 'local-test-user';
export const LOCAL_AUTH_STORAGE_KEY = 'suveca_local_dev_auth_enabled';
export const LOCAL_ACCOUNTS_STORAGE_KEY = 'suveca_local_accounts';
export const LOCAL_ACTIVE_USER_STORAGE_KEY = 'suveca_active_local_user';

export interface LocalAccount {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
}

export const LOCAL_TEST_USER: User = {
  uid: LOCAL_TEST_USER_ID,
  displayName: 'Eu (Conta Teste)',
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
      displayName: 'Eu (Conta Teste)',
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

export function buildUserFromAccount(account: LocalAccount): User {
  const uid = `local-user-${account.id}`;
  const email = account.username.includes('@')
    ? account.username
    : `${account.username}@suveca.local`;

  return {
    uid,
    displayName: account.displayName,
    email,
    photoURL: '',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: account.createdAt,
      lastSignInTime: account.lastLoginAt || new Date().toUTCString(),
    },
    providerData: [
      {
        uid,
        displayName: account.displayName,
        email,
        phoneNumber: null,
        photoURL: '',
        providerId: 'custom',
      },
    ],
    refreshToken: `local-refresh-token-${account.id}`,
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
        claims: { uid },
      } as unknown as IdTokenResult),
    reload: async () => {},
    toJSON: () => ({ uid, email, displayName: account.displayName }),
    phoneNumber: null,
    providerId: 'custom',
  };
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(`suveca_salt_v1:${password}`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback abaixo
    }
  }

  let hash = 5381;
  const str = `suveca_salt_v1:${password}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return `fb_${Math.abs(hash).toString(16)}`;
}

export function getLocalAccounts(): LocalAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(accounts: LocalAccount[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

export function findLocalAccount(username: string): LocalAccount | undefined {
  const clean = username.trim().toLowerCase();
  return getLocalAccounts().find((acc) => acc.username.toLowerCase() === clean);
}

export async function createLocalAccount(
  username: string,
  displayName: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const cleanUser = username.trim().toLowerCase();
  const cleanName = displayName.trim();

  if (!cleanUser || cleanUser.length < 2) {
    return { success: false, error: 'O nome de usuário deve ter pelo menos 2 caracteres.' };
  }
  if (!cleanName) {
    return { success: false, error: 'Informe um nome de exibição para seu perfil.' };
  }
  if (!password || password.length < 3) {
    return { success: false, error: 'A senha deve ter no mínimo 3 caracteres.' };
  }
  if (cleanUser === 'teste' || cleanUser === 'guest' || cleanUser === 'local-test-user') {
    return { success: false, error: 'Este nome de usuário é reservado para a conta de testes.' };
  }

  const existing = findLocalAccount(cleanUser);
  if (existing) {
    return { success: false, error: 'Já existe uma conta com este nome de usuário.' };
  }

  const passwordHash = await hashPassword(password);
  const newAccount: LocalAccount = {
    id: `u_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUser,
    displayName: cleanName,
    passwordHash,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const accounts = getLocalAccounts();
  accounts.push(newAccount);
  saveLocalAccounts(accounts);

  const user = buildUserFromAccount(newAccount);
  setActiveLocalUser(user);
  return { success: true, user };
}

export async function loginLocalAccount(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  const cleanUser = username.trim().toLowerCase();
  if (!cleanUser || !password) {
    return { success: false, error: 'Informe usuário e senha para entrar.' };
  }

  if (cleanUser === 'teste' || cleanUser === 'local-test-user') {
    const testUser = loginAsTestUser();
    return { success: true, user: testUser };
  }

  const account = findLocalAccount(cleanUser);
  if (!account) {
    return { success: false, error: 'Conta não encontrada. Verifique o usuário ou crie uma nova conta.' };
  }

  const computedHash = await hashPassword(password);
  if (computedHash !== account.passwordHash) {
    return { success: false, error: 'Senha incorreta. Tente novamente.' };
  }

  account.lastLoginAt = new Date().toISOString();
  const accounts = getLocalAccounts().map((a) => (a.id === account.id ? account : a));
  saveLocalAccounts(accounts);

  const user = buildUserFromAccount(account);
  setActiveLocalUser(user);
  return { success: true, user };
}

export function loginAsTestUser(): User {
  setActiveLocalUser(LOCAL_TEST_USER);
  return LOCAL_TEST_USER;
}

export function getActiveLocalUser(): User | null {
  if (typeof window === 'undefined') return null;
  if (!isLocalAuthActive()) return null;

  const storedActiveId = localStorage.getItem(LOCAL_ACTIVE_USER_STORAGE_KEY);
  if (!storedActiveId || storedActiveId === LOCAL_TEST_USER_ID) {
    return LOCAL_TEST_USER;
  }

  const accounts = getLocalAccounts();
  const matched = accounts.find(
    (acc) => `local-user-${acc.id}` === storedActiveId || acc.id === storedActiveId
  );
  if (matched) {
    return buildUserFromAccount(matched);
  }

  return LOCAL_TEST_USER;
}

export function setActiveLocalUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, 'true');
    localStorage.setItem(LOCAL_ACTIVE_USER_STORAGE_KEY, user.uid);
    window.dispatchEvent(
      new CustomEvent('suveca:local-auth-change', { detail: { active: true, user } })
    );
  } else {
    localStorage.removeItem(LOCAL_ACTIVE_USER_STORAGE_KEY);
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('suveca:local-auth-change', { detail: { active: false, user: null } })
    );
  }
}

export function logoutLocalUser(returnToTest = true): void {
  if (returnToTest) {
    loginAsTestUser();
  } else {
    setActiveLocalUser(null);
  }
}

export function isLocalAuthActive(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) === 'true';
}

export function isTestUser(user?: User | null): boolean {
  return user?.uid === LOCAL_TEST_USER_ID;
}

export function isPersonalLocalUser(user?: User | null): boolean {
  return Boolean(user?.uid?.startsWith('local-user-'));
}

export function isAnyLocalUser(user?: User | null): boolean {
  return Boolean(user?.uid === LOCAL_TEST_USER_ID || user?.uid?.startsWith('local-'));
}

export function ensureDefaultLocalAuth(): User {
  if (typeof window === 'undefined') return LOCAL_TEST_USER;

  if (localStorage.getItem(LOCAL_AUTH_STORAGE_KEY) === null) {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, 'true');
    localStorage.setItem(LOCAL_ACTIVE_USER_STORAGE_KEY, LOCAL_TEST_USER_ID);
  }

  return getActiveLocalUser() || LOCAL_TEST_USER;
}

export function setLocalAuthActive(active: boolean): void {
  if (typeof window === 'undefined') return;
  if (active) {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, 'true');
    const currentUser = getActiveLocalUser() || LOCAL_TEST_USER;
    localStorage.setItem(LOCAL_ACTIVE_USER_STORAGE_KEY, currentUser.uid);
    window.dispatchEvent(
      new CustomEvent('suveca:local-auth-change', { detail: { active: true, user: currentUser } })
    );
  } else {
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent('suveca:local-auth-change', { detail: { active: false, user: null } })
    );
  }
}

export function toggleLocalAuth(): boolean {
  const next = !isLocalAuthActive();
  setLocalAuthActive(next);
  return next;
}
