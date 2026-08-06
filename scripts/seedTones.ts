// Seeds/updates the `diagnosisContent` tone-{0..12} docs from
// docs/銀河の音診断結果マスタ.xlsx (parsed once into scripts/tones.data.ts — see that file for
// the parsing notes and data-quality fixes applied). This supersedes the placeholder tone copy
// that used to be written by scripts/seedContent.ts (deleted 2026-08-05 in favor of this real
// master — that script's last remaining job was placeholder tone-* seeding; sun-*/wavespell-*
// had already moved to scripts/seedCharacters.ts earlier).
//
// Run via: npm run seed:tones            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:tones:emulator   (local Firestore emulator; no credentials needed)
//
// Idempotent like scripts/seedCharacters.ts: skips a doc that already has a non-empty `title`
// field — i.e. one that's already been seeded from this master — so it can never clobber an
// admin's later edits made via /admin/content, even if re-run.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { TONE_SEED } from './tones.data'
import { TONES } from '../utils/mayaData'
import { formatCelebrities } from '../utils/toneCelebrities'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:tones:emulator`.')
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

  for (const tone of TONE_SEED) {
    const ref = collectionRef.doc(`tone-${tone.index}`)
    const existing = await ref.get()
    if (existing.exists && (existing.data() as { title?: string })?.title) {
      skipped++
      continue
    }
    batch.set(
      ref,
      {
        type: 'tone',
        index: tone.index,
        name: TONES[tone.index].name,
        freeText: tone.overview,
        premiumText: '',
        status: '公開',
        title: tone.title,
        basicSpecs: tone.basicSpecs,
        strengths: tone.strengths,
        cautions: tone.cautions,
        celebrities: formatCelebrities(tone.celebrities),
        updatedAt: FieldValue.serverTimestamp()
      },
      { merge: true }
    )
    written++
  }

  await batch.commit()
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Tone seed complete against ${target}: ${written} written, ${skipped} skipped (already seeded — never overwritten).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
