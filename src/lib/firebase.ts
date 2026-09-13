import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Firestore's persistent cache lets previously opened modules, notes and
// flashcard schedules remain usable without a connection. Pending writes are
// replayed by the SDK as soon as the learner comes back online.
export const db = (() => {
  try {
    return initializeFirestore(
      firebaseApp,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firestoreDatabaseId
    );
  } catch (error) {
    // A second Firebase bundle or a restrictive browser can already have a
    // Firestore instance. The app remains functional with the default cache.
    console.warn('Cache persistente do Firestore indisponível:', error);
    return getFirestore(firebaseApp, firestoreDatabaseId);
  }
})();

export const firebaseProjectId = firebaseConfig.projectId;
export { firebaseConfig };

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain?: string;
  projectId?: string;
}

export const dispatchAuthError = (err: any): AuthErrorInfo => {
  const errorInfo: AuthErrorInfo = {
    code: err?.code || 'auth/unknown',
    message: err?.message || 'Erro ao realizar login Google.',
    domain: typeof window !== 'undefined' ? window.location.hostname : undefined,
    projectId: firebaseConfig.projectId,
  };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('suveca:auth-error', { detail: errorInfo }));
  }
  return errorInfo;
};

export const signInWithGoogle = async (): Promise<User> => {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    return cred.user;
  } catch (err: any) {
    dispatchAuthError(err);
    throw err;
  }
};

export { signInWithPopup, signOut, onAuthStateChanged };
export type { User };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Remove recursively all keys whose values are undefined.
 * Firestore rejects documents containing undefined field values.
 */
export function removeUndefinedFields<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => removeUndefinedFields(item)) as unknown as T;
  }
  if (isPlainObject(value)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned as T;
  }
  return value;
}

export const safeSetDoc = async <T extends Record<string, any>>(
  reference: DocumentReference,
  data: T,
  options?: SetOptions
) => {
  const cleanedData = removeUndefinedFields(data);
  if (options) {
    return setDoc(reference, cleanedData, options);
  }
  return setDoc(reference, cleanedData);
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

