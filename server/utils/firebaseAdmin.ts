import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let db: Firestore | null = null

// Lazily initialized singleton — Nitro reuses this module's scope across
// requests (and across warm invocations under the firebase preset), so this
// avoids re-parsing the service account key / re-initializing the SDK per request.
export function getAdminDb(): Firestore {
  if (db) return db

  // `npm run dev` defaults to the local Firestore emulator (see firebase.json
  // emulators.firestore.port) — no real credentials needed there, since the
  // emulator ignores auth entirely. FIRESTORE_EMULATOR_HOST is also the exact
  // env var Firebase's own tooling auto-injects when this function later runs
  // under `firebase emulators:start` (Functions + Firestore together), so
  // checking it directly (rather than only import.meta.dev) covers both cases.
  if (import.meta.dev && !process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  }

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    const { public: { firebase } } = useRuntimeConfig()
    const app = getApps().length ? getApps()[0] : initializeApp({ projectId: firebase.projectId })
    db = getFirestore(app)
    return db
  }

  const { firebaseServiceAccountKey } = useRuntimeConfig()
  if (!firebaseServiceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Generate one from Firebase Console → Project Settings → Service Accounts, and add it to .env.')
  }

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({ credential: cert(JSON.parse(firebaseServiceAccountKey)) })

  db = getFirestore(app)
  return db
}
