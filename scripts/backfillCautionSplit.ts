// One-time migration for the 2026-08-05 paywall boundary fix (see CLAUDE.md / scripts/characters.data.ts):
// `character-{0..19}` docs seeded before this change have `cautionDetail` holding the full
// row14+row15 text from docs/診断結果マスタ.xlsx as a single field, with no `cautionDetailPremium`.
// scripts/seedCharacters.ts can't fix this on its own — it skips any doc that already has a
// non-empty `archetype`, which every already-seeded character doc does (that's what keeps it
// from clobbering admin edits). This script instead does a narrow, single-purpose backfill:
// it only touches docs that (a) already exist and (b) are still missing `cautionDetailPremium`,
// and only writes `cautionDetail`/`cautionDetailPremium`, pulled from the current
// scripts/characters.data.ts (the authoritative split). Once a doc has `cautionDetailPremium`,
// re-running this script always skips it — so, like the other seed scripts, it can never
// clobber a later admin edit to either field.
//
// Run via: npm run backfill:caution-split            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run backfill:caution-split:emulator   (local Firestore emulator; no credentials needed)
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CHARACTER_SEED } from './characters.data'

// 2026-09-07: 実行停止。有料項目は diagnosisContentPremium へ分離済み
// (utils/premiumContent.ts / scripts/splitPremiumContent.ts)。このスクリプトは分離前の
// スキーマ — 有料項目が diagnosisContent に同居していた頃 — を前提に一度だけ実行された
// 履歴的な移行で、いま実行すると有料項目を無料コレクション(allow read: if true)へ
// 書き戻し、有料本文を全公開に戻してしまう。過去にどんな変換をしたかの記録として
// ファイルは残すが、実行はここで止める。
console.error(
  'このスクリプトは実行済みの履歴的な移行です。有料項目の分離後に実行すると有料本文を再公開してしまうため、実行を停止しました。'
)
process.exit(1)

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run backfill:caution-split:emulator`.')
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
    if (!existing.exists) {
      skipped++
      continue
    }
    const data = existing.data() as { cautionDetailPremium?: string }
    if (data.cautionDetailPremium) {
      skipped++
      continue
    }
    batch.update(ref, {
      cautionDetail: character.cautionDetail,
      cautionDetailPremium: character.cautionDetailPremium,
      updatedAt: FieldValue.serverTimestamp()
    })
    written++
  }

  await batch.commit()
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Backfill complete against ${target}: ${written} written, ${skipped} skipped (missing doc or already migrated).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
