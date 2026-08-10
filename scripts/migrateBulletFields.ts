// One-off migration: converts the "pure bullet list" profile fields from their old
// "<marker>a\n<marker>b\n<marker>c" string format to real string[] arrays, on
// `character-{0..19}` and `tone-{0..12}` docs that were seeded before this schema change.
// Bullet marker character varies by field (・/✓/⚡ — checked directly against
// scripts/characters.data.ts, not guessed) — see MARKERS below. Idempotent — a field already
// holding an array is left untouched, so this is safe to re-run (e.g. after a partial run, or
// against a project where some docs were seeded before the change and some after).
//
// Run via: npm run migrate:bulletFields            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run migrate:bulletFields:emulator   (local Firestore emulator; no credentials needed)
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run migrate:bulletFields:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

const CHARACTER_LIST_FIELDS = [
  'traits', 'likes', 'dislikes', 'communicationChallenges', 'luckUpActions',
  'communicationStrengths', 'practicalTips', 'strengthsSummary', 'cautionSummary'
]
const TONE_LIST_FIELDS = ['basicSpecs', 'strengths', 'cautions']

// ・ (traits/likes/dislikes/communicationChallenges/luckUpActions/basicSpecs/strengths/
// cautions), ✓ (communicationStrengths/strengthsSummary), ⚡ (practicalTips), ⚠ (cautionSummary).
// index 7 (黄色い星)'s cautionSummary has no marker at all (known data-quality exception, see
// scripts/characters.data.ts) — lines are kept as-is when no marker matches, not skipped.
const MARKERS = ['・', '✓', '⚡', '⚠']

function stringToList(value: string): string[] {
  return value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const marker = MARKERS.find((m) => l.startsWith(m))
      return marker ? l.slice(marker.length).trim() : l
    })
}

async function migrateDocs(idPrefix: string, count: number, fields: string[]) {
  const collectionRef = db.collection('diagnosisContent')
  let converted = 0
  let alreadyArray = 0
  let missing = 0
  const perField: Record<string, number> = Object.fromEntries(fields.map((f) => [f, 0]))

  for (let i = 0; i < count; i++) {
    const ref = collectionRef.doc(`${idPrefix}-${i}`)
    const snap = await ref.get()
    if (!snap.exists) {
      missing++
      continue
    }
    const data = snap.data() as Record<string, unknown>
    const updates: Record<string, unknown> = {}
    let touched = false
    for (const field of fields) {
      const value = data[field]
      if (Array.isArray(value)) {
        alreadyArray++
        continue
      }
      if (typeof value === 'string' && value) {
        updates[field] = stringToList(value)
        perField[field]++
        touched = true
      }
    }
    if (touched) {
      updates.updatedAt = FieldValue.serverTimestamp()
      await ref.update(updates)
      converted++
    }
  }

  console.log(`  ${idPrefix}-*: ${converted} docs updated, ${alreadyArray} fields already arrays, ${missing} docs missing`)
  for (const field of fields) console.log(`    ${field}: ${perField[field]} converted`)
}

async function main() {
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Migrating bullet-list fields against ${target}...`)
  await migrateDocs('character', 20, CHARACTER_LIST_FIELDS)
  await migrateDocs('tone', 13, TONE_LIST_FIELDS)
  console.log('Done.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
