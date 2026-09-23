// 印(paidSource / source == 'mock')を付ける前に付いた有料会員・単体購入に、後から印を付ける一度きりの移行。
// #140 で印を導入したが、それ以前に仮の決済画面や管理画面で有料会員になった会員、単体購入した会員の
// データには印が無く、scripts/resetMockPurchases.ts(本番決済の導入時に仮のものを戻す)の対象から漏れる。
// 本番決済(Stripe)が無い今、plan == 'paid' も purchases / unlocks も全部「払っていない仮のもの」なので、
// 印の無いものはすべて 'mock' として扱ってよい。
//
//   users/{uid}: plan == 'paid' かつ paidSource が無い     → paidSource: 'mock'
//   users/{uid}/purchases/*: source が無い                → source: 'mock'
//   users/{uid}/unlocks/*:   source が無い                → source: 'mock'
//
// 実行: npm run backfill:mock-marker -- --dry-run   (件数だけ表示、書き込みなし)
//       npm run backfill:mock-marker                 (REAL project。.env の FIREBASE_SERVICE_ACCOUNT_KEY が必要)
//       npm run backfill:mock-marker:emulator [-- --dry-run]
// 冪等: 2回目は対象 0 件になる。Stripe 導入後は実行しないこと(本物の購入に印を付けてしまう)。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'
const dryRun = process.argv.includes('--dry-run')

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run backfill:mock-marker:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}
const db = getFirestore(app)

async function main() {
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `REAL project ${projectId}`
  console.log(`${dryRun ? '[dry-run] ' : ''}Backfilling mock markers against ${target}`)

  let paidMarked = 0
  let purchasesMarked = 0
  let unlocksMarked = 0
  let batch = db.batch()
  let pending = 0
  async function flush(force = false) {
    if (pending === 0 || (!force && pending < 400)) return
    if (!dryRun) await batch.commit()
    batch = db.batch()
    pending = 0
  }

  const users = await db.collection('users').get()
  for (const user of users.docs) {
    if (user.get('plan') === 'paid' && !user.get('paidSource')) {
      paidMarked++
      console.log(`  user ${user.id}: plan paid without marker → paidSource: mock`)
      batch.update(user.ref, { paidSource: 'mock' })
      pending++
    }
    let p = 0
    let u = 0
    for (const d of (await user.ref.collection('purchases').get()).docs) {
      if (d.get('source')) continue
      p++
      batch.update(d.ref, { source: 'mock' })
      pending++
    }
    for (const d of (await user.ref.collection('unlocks').get()).docs) {
      if (d.get('source')) continue
      u++
      batch.update(d.ref, { source: 'mock' })
      pending++
    }
    purchasesMarked += p
    unlocksMarked += u
    if (p || u) console.log(`  user ${user.id}: purchases ${p}, unlocks ${u} → source: mock`)
    await flush()
  }
  await flush(true)

  console.log(`${dryRun ? '[dry-run] would mark' : 'Marked'}: ${paidMarked} paid member(s), ${purchasesMarked} purchase record(s), ${unlocksMarked} unlock(s) (out of ${users.size} users).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
