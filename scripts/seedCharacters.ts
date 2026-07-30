// Seeds/updates the `diagnosisContent` character-{0..19} docs from docs/診断結果マスタ.xlsx
// (parsed once into scripts/characters.data.ts — see that file for the parsing notes and
// data-quality fixes applied, including the 2026-07-30 rename from "sun"/"seal profile" to
// "character"). This is now the single source of the per-character profile shown wherever a
// seal appears in the UI (太陽の紋章/ウェイブスペル today) — see
// composables/useDiagnosisContent.ts. There is no more separate `wavespell-{i}` doc type; it
// was dropped as unused placeholder content in the same change.
//
// Run via: npm run seed:characters            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:characters:emulator   (local Firestore emulator; no credentials needed)
//
// Idempotent like seedContent.ts, but keyed on a different marker: seedContent.ts skips a doc
// that already *exists*. This script instead skips a doc that already has a non-empty
// `archetype` field — i.e. one that's already been seeded from the master — so it can never
// clobber an admin's later edits made via /admin/content, even if re-run.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CHARACTER_SEED } from './characters.data'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:characters:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

async function main() {
  const collectionRef = db.collection('diagnosisContent')
  const batch = db.batch()
  let written = 0
  let skipped = 0

  for (const character of CHARACTER_SEED) {
    const ref = collectionRef.doc(`character-${character.index}`)
    const existing = await ref.get()
    if (existing.exists && (existing.data() as { archetype?: string })?.archetype) {
      skipped++
      continue
    }
    const { index, ...fields } = character
    batch.set(
      ref,
      {
        type: 'character',
        index,
        name: fields.name,
        freeText: fields.overview,
        premiumText: '',
        status: '公開',
        ...fields,
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )
    written++
  }

  await batch.commit()
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Character seed complete against ${target}: ${written} written, ${skipped} skipped (already seeded — never overwritten).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
