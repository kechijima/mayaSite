// 到達度診断テストの問題(achievementTests/{sealIndex}、20紋章 × 25問)を Firestore に入れる。
// 原本は docs/到達度診断テスト/*.xlsx。scripts/extractAchievementTests.py が
// scripts/achievementTests.data.ts に起こしたものを書く(取り込み時の手直しはそちらの冒頭を参照)。
//
// Run via: npm run seed:tests            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:tests:emulator   (local Firestore emulator; no credentials needed)
//
// 他の seed と同じく冪等: 既に categories を持つドキュメントは飛ばす(再実行しても上書きしない)。
// 原本を直して入れ直したいときは --force を付ける(全件上書き)。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ACHIEVEMENT_TEST_SEED } from './achievementTests.data'
import { SEALS } from '../utils/mayaData'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'
const force = process.argv.includes('--force')

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:tests:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

async function main() {
  const collectionRef = db.collection('achievementTests')
  const batch = db.batch()
  let written = 0
  let skipped = 0

  for (const test of ACHIEVEMENT_TEST_SEED) {
    if (SEALS[test.sealIndex]?.name !== test.sealName) {
      throw new Error(`sealIndex ${test.sealIndex} は ${SEALS[test.sealIndex]?.name} のはずだが、データは ${test.sealName}`)
    }
    const ref = collectionRef.doc(String(test.sealIndex))
    const existing = await ref.get()
    if (!force && existing.exists && (existing.data() as { categories?: unknown[] })?.categories?.length) {
      skipped++
      continue
    }
    batch.set(ref, {
      sealIndex: test.sealIndex,
      sealName: test.sealName,
      categories: test.categories,
      updatedAt: FieldValue.serverTimestamp()
    })
    written++
  }

  await batch.commit()
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Achievement test seed complete against ${target}: ${written} written, ${skipped} skipped${force ? ' (--force)' : ' (already seeded — never overwritten)'}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
