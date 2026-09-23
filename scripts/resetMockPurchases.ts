// 仮の決済(決済モック期間)で付いた有料会員・単体購入を全部なかったことにする、一度きりの移行。
// 本番決済(Stripe)を導入するときに、rules から【決済モック期間限定】の分岐を消した後に実行する。
//
//   users/{uid}.paidSource == 'mock'        → plan: 'free', paidAt: null, paidSource: null
//   users/{uid}/purchases/* (source=='mock') → 削除
//   users/{uid}/unlocks/*   (source=='mock') → 削除
//
// 印(source / paidSource == 'mock')の付いていないものには触らない — Webhook が付ける本物の
// 購入と区別するため(firestore.rules は本人の書き込みにこの印を必ず要求している)。
// チーム会員は teamId で判定しているので影響しない。
//
// 実行: npm run reset:mock-purchases -- --dry-run   (件数だけ表示、書き込みなし)
//       npm run reset:mock-purchases                 (REAL project。.env の FIREBASE_SERVICE_ACCOUNT_KEY が必要)
//       npm run reset:mock-purchases:emulator [-- --dry-run]
// 冪等: 2回目は対象 0 件になる。
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
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run reset:mock-purchases:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}
const db = getFirestore(app)

async function main() {
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator (${process.env.FIRESTORE_EMULATOR_HOST})` : `REAL project ${projectId}`
  console.log(`${dryRun ? '[dry-run] ' : ''}Resetting mock purchases against ${target}`)

  let paidReset = 0
  let purchasesDeleted = 0
  let unlocksDeleted = 0
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
    if (user.get('paidSource') === 'mock') {
      paidReset++
      console.log(`  user ${user.id}: plan paid(mock) → free`)
      batch.update(user.ref, { plan: 'free', paidAt: null, paidSource: null })
      pending++
    }
    const purchases = await user.ref.collection('purchases').where('source', '==', 'mock').get()
    for (const p of purchases.docs) {
      purchasesDeleted++
      batch.delete(p.ref)
      pending++
    }
    const unlocks = await user.ref.collection('unlocks').where('source', '==', 'mock').get()
    for (const u of unlocks.docs) {
      unlocksDeleted++
      batch.delete(u.ref)
      pending++
    }
    if (purchases.size || unlocks.size) console.log(`  user ${user.id}: purchases(mock) ${purchases.size}, unlocks(mock) ${unlocks.size}`)
    await flush()
  }
  await flush(true)

  console.log(`${dryRun ? '[dry-run] would reset' : 'Reset'}: ${paidReset} paid member(s) → free, ${purchasesDeleted} purchase record(s) and ${unlocksDeleted} unlock(s) deleted (out of ${users.size} users).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
