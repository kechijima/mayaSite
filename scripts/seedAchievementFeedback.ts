// 到達度診断テストの結果画面のフィードバック文(achievementFeedback/{sealIndex}、20紋章 × 5カテゴリ × 4段階)を
// Firestore に入れる。中身は scripts/achievementFeedback.data.ts の初稿。
//
// Run via: npm run seed:feedback            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run seed:feedback:emulator   (local Firestore emulator; no credentials needed)
//
// 他の seed と同じく冪等: 既に feedback を持つドキュメントは飛ばす(管理画面で直した文を上書きしない)。
// 初稿を入れ直したいときは --force を付ける(全件上書き。管理画面での手直しも消える)。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { ACHIEVEMENT_FEEDBACK_SEED } from './achievementFeedback.data'
import { SEALS } from '../utils/mayaData'
import { TEST_CATEGORY_KEYS } from '../utils/achievementTest'
import { TEST_BAND_COUNT } from '../utils/achievementTestFeedback'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'
const force = process.argv.includes('--force')

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run seed:feedback:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)

function hasAnyText(feedback: unknown): boolean {
  if (!feedback || typeof feedback !== 'object') return false
  return Object.values(feedback as Record<string, unknown>).some((list) => Array.isArray(list) && list.some((t) => typeof t === 'string' && t.trim()))
}

async function main() {
  const collectionRef = db.collection('achievementFeedback')
  const batch = db.batch()
  let written = 0
  let skipped = 0

  for (const item of ACHIEVEMENT_FEEDBACK_SEED) {
    if (SEALS[item.sealIndex]?.name !== item.sealName) {
      throw new Error(`sealIndex ${item.sealIndex} は ${SEALS[item.sealIndex]?.name} のはずだが、データは ${item.sealName}`)
    }
    for (const key of TEST_CATEGORY_KEYS) {
      const list = item.feedback[key]
      if (!Array.isArray(list) || list.length !== TEST_BAND_COUNT) throw new Error(`${item.sealName} の ${key} が ${TEST_BAND_COUNT} 本ではない`)
    }
    const ref = collectionRef.doc(String(item.sealIndex))
    const existing = await ref.get()
    if (!force && existing.exists && hasAnyText(existing.data()?.feedback)) {
      skipped++
      continue
    }
    batch.set(ref, {
      sealIndex: item.sealIndex,
      sealName: item.sealName,
      feedback: item.feedback,
      updatedAt: FieldValue.serverTimestamp()
    })
    written++
  }

  await batch.commit()
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `real project (${projectId})`
  console.log(`Achievement feedback seed complete against ${target}: ${written} written, ${skipped} skipped${force ? ' (--force)' : ' (already has text — never overwritten)'}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
