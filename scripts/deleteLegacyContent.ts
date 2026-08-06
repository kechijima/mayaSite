// One-off cleanup: deletes the `sun-{0..19}` and `wavespell-{0..19}` diagnosisContent docs left
// over from the pre-2026-07-30 schema (before sun-*/wavespell-* were unified into character-*
// and wavespell-* was dropped entirely — see scripts/characters.data.ts's header comment). No
// code reads these IDs anymore (composables/useDiagnosisContent.ts only fetches character-*/
// tone-*/kin-*), so they're pure orphans. Safe to re-run — missing docs are silently skipped.
//
// Run via: npm run cleanup:legacy-content            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run cleanup:legacy-content:emulator   (local Firestore emulator; no credentials needed)
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run cleanup:legacy-content:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

async function main() {
  const collectionRef = db.collection('diagnosisContent')
  const ids = [
    ...Array.from({ length: 20 }, (_, i) => `sun-${i}`),
    ...Array.from({ length: 20 }, (_, i) => `wavespell-${i}`)
  ]

  const batch = db.batch()
  let found = 0
  for (const id of ids) {
    const ref = collectionRef.doc(id)
    const snap = await ref.get()
    if (!snap.exists) continue
    found++
    batch.delete(ref)
  }
  if (found > 0) await batch.commit()

  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Legacy content cleanup complete against ${target}: ${found} of ${ids.length} candidate docs existed and were deleted.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
