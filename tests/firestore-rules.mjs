// Run only against a local emulator: FIRESTORE_EMULATOR_HOST=127.0.0.1:8185 npm run test:firestore
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const endpoint = process.env.FIRESTORE_EMULATOR_HOST || '';
if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('Set FIRESTORE_EMULATOR_HOST to a local emulator at 127.0.0.1:<port>.');
const environment = await initializeTestEnvironment({
  projectId: 'demo-suveca-rules',
  firestore: { host: '127.0.0.1', port: Number(endpoint.split(':')[1]), rules: fs.readFileSync('firestore.rules', 'utf8') },
});
try {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'users/alice/pblSessions/session-1'), { userId: 'alice', attempts: [] });
  });
  const owner = environment.authenticatedContext('alice').firestore();
  const other = environment.authenticatedContext('bob').firestore();
  const guest = environment.unauthenticatedContext().firestore();
  let assertions = 0;
  for (const database of [owner, other, guest]) {
    const read = database === owner ? assertSucceeds : assertFails;
    await read(getDoc(doc(database, 'users/alice/pblSessions/session-1'))); assertions++;
    await read(getDocs(collection(database, 'users/alice/pblSessions'))); assertions++;
    await assertFails(setDoc(doc(database, 'users/alice/pblSessions/session-1'), { attempts: [{ isCorrect: true }] })); assertions++;
    await assertFails(setDoc(doc(database, 'users/alice/pblSessions/forged'), { userId: 'alice' })); assertions++;
    await assertFails(deleteDoc(doc(database, 'users/alice/pblSessions/session-1'))); assertions++;
    for (const resource of ['pblMastery/competency', 'push_subscriptions/token-hash', 'data/saved_tips']) {
      const permission = database === owner ? assertSucceeds : assertFails;
      await permission(setDoc(doc(database, `users/alice/${resource}`), { privateCache: true })); assertions++;
      await permission(getDoc(doc(database, `users/alice/${resource}`))); assertions++;
    }
  }
  console.log(JSON.stringify({ status: 'PASS', assertions, scope: 'PBL sessions are server-written; private cache, push tokens and saved tips are owner-only.' }));
} finally { await environment.cleanup(); }
