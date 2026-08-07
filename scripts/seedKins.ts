// Seeds the `diagnosisContent` kin-{1..260} docs from docs/KIN番号診断結果マスタ.xlsx (parsed
// once into scripts/kins.data.ts — see that file for the parsing notes). Unlike character-*/
// tone-*, kin-* docs are a single flowing freeText paragraph with no CMS sub-fields (the master
// has no title/bullets/etc. structure — see pages/result.vue's KIN text section for how it's
// displayed, right after the KIN overview badge).
//
// Run via: npm run seed:kins            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:kins:emulator   (local Firestore emulator; no credentials needed)
//
// Idempotent like scripts/seedContent.ts used to be: skips a doc that already *exists* (there's
// no earlier placeholder seeder for kin-* to distinguish from, unlike character-*/tone-*), so
// this can never clobber an admin's later edits made via /admin/content, even if re-run.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { KIN_SEED } from './kins.data'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:kins:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

async function main() {
  const collectionRef = db.collection('diagnosisContent')
  let written = 0
  let skipped = 0

  // 260 docs exceeds a single batch's comfortable size margin-of-safety in spirit (limit is
  // 500), but chunking keeps this consistent with not leaning on the limit.
  const chunkSize = 100
  for (let start = 0; start < KIN_SEED.length; start += chunkSize) {
    const chunk = KIN_SEED.slice(start, start + chunkSize)
    const batch = db.batch()
    for (const kin of chunk) {
      const ref = collectionRef.doc(`kin-${kin.index}`)
      const existing = await ref.get()
      if (existing.exists) {
        skipped++
        continue
      }
      batch.set(ref, {
        type: 'kin',
        index: kin.index,
        name: `KIN${kin.index}`,
        freeText: kin.freeText,
        premiumText: '',
        status: '公開',
        updatedAt: FieldValue.serverTimestamp()
      })
      written++
    }
    await batch.commit()
  }

  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Kin seed complete against ${target}: ${written} written, ${skipped} skipped (already seeded — never overwritten).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
