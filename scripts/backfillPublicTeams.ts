// 既存チームぶんの publicTeams/{teamId} を作る移行スクリプト。
//
// publicTeams は紹介コード付き会員登録(pages/signup/referral.vue)と /account の
// チーム選択プルダウン用の公開コピー({ name, active })。新しく作るチームや改名・
// コードの有効/無効切り替えは utils/referralTeamAdmin.ts が同じバッチで更新するので、
// このスクリプトが必要なのは publicTeams 導入前から存在するチームだけ。
//
// name は referralTeams.name、active は referralCodes/{code}.status === 'active' から作る。
//
// Run via: npm run backfill:public-teams            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run backfill:public-teams:emulator   (local Firestore emulator; no credentials needed)
//      --dry-run を付けると書き込まずに対象だけ表示する
//
// 冪等: 既に publicTeams が存在し、内容も一致しているチームはスキップする。
// 内容が食い違っている場合(導入前に改名された等)は referralTeams/referralCodes 側に揃える。
//
// デプロイ順: firestore.rules(publicTeams のルール)を先に出してから実行すること。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run backfill:public-teams:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)
const dryRun = process.argv.includes('--dry-run')

async function main() {
  const teams = await db.collection('referralTeams').get()
  let written = 0
  let skipped = 0

  for (const team of teams.docs) {
    const data = team.data() as { name?: string; code?: string }
    const name = data.name ?? ''
    const codeSnap = data.code ? await db.collection('referralCodes').doc(data.code).get() : null
    const active = codeSnap?.exists === true && codeSnap.data()?.status === 'active'

    const ref = db.collection('publicTeams').doc(team.id)
    const current = await ref.get()
    if (current.exists && current.data()?.name === name && current.data()?.active === active) {
      skipped++
      continue
    }

    if (dryRun) {
      console.log(`  [dry-run] ${team.id}: ${name} (${active ? '有効' : '無効'})${current.exists ? ' — 内容を更新' : ''}`)
      written++
      continue
    }
    await ref.set({ name, active })
    written++
  }

  console.log(`publicTeams: ${written} 件を${dryRun ? '作成予定' : '作成/更新'} / ${skipped} 件は作成済みでスキップ`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
