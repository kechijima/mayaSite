// Adds the `celebrities` array to the existing `diagnosisContent` kin-{1..260} docs, from
// docs/芸能人マスタ.xlsx (parsed once into scripts/celebrities.data.ts — see that file for the
// parsing notes and the known data-quality caveats).
//
// Run via: npm run seed:celebrities            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:celebrities:emulator   (local Firestore emulator; no credentials needed)
//
// 他のseedスクリプトとの違い: あちらは「ドキュメントが既にあればスキップ」だが、これは既存の
// kin-* ドキュメントに kinCelebrities フィールドを足すのが目的なので、存在するドキュメントを update する。
// 触るのは kinCelebrities と updatedAt だけなので、/admin/content で編集された freeText などは
// 上書きされない。逆に kin-* が未作成の場合は先に npm run seed:kins が必要 — 黙って
// 作らずスキップして最後に件数を報告する(空のドキュメントに芸能人だけ入るのを避けるため)。
//
// 既に入っている内容と一致するドキュメントはスキップする。単に「フィールドがあるか」で判定
// しないのは、一部のKINだけ修正した時に差分だけ反映させたいため(全件 update すると260件の
// updatedAt が動いて管理画面の「最終更新」が意味を失う)。npm run dev から毎回呼ばれるが、
// 内容が変わっていなければ1件も書き込まない。--force を付けると比較せず全件書き直す。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { CELEBRITY_SEED } from './celebrities.data'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:celebrities:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

async function main() {
  const collectionRef = db.collection('diagnosisContent')
  let updated = 0
  let missing = 0
  let skipped = 0
  let entries = 0
  const force = process.argv.includes('--force')

  const chunkSize = 100
  for (let start = 0; start < CELEBRITY_SEED.length; start += chunkSize) {
    const chunk = CELEBRITY_SEED.slice(start, start + chunkSize)
    const batch = db.batch()
    for (const kin of chunk) {
      const ref = collectionRef.doc(`kin-${kin.index}`)
      const existing = await ref.get()
      if (!existing.exists) {
        missing++
        continue
      }
      const stored = existing.data()?.kinCelebrities
      if (!force && JSON.stringify(stored) === JSON.stringify(kin.celebrities)) {
        skipped++
        continue
      }
      batch.update(ref, {
        kinCelebrities: kin.celebrities,
        updatedAt: FieldValue.serverTimestamp()
      })
      updated++
      entries += kin.celebrities.length
    }
    await batch.commit()
  }

  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Celebrity seed complete against ${target}: ${updated} kin docs updated (${entries} people), ${skipped} unchanged (skipped).`)
  if (missing > 0) {
    console.warn(`${missing} kin docs did not exist and were skipped — run \`npm run seed:kins\` first, then re-run this.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
