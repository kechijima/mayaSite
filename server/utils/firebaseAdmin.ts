import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let db: Firestore | null = null

// Lazily initialized singleton — Nitro reuses this module's scope across
// requests (and across warm invocations under the firebase preset), so this
// avoids re-parsing the service account key / re-initializing the SDK per request.
export function getAdminDb(): Firestore {
  if (db) return db

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
