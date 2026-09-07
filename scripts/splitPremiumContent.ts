// 既存の diagnosisContent から有料項目を diagnosisContentPremium へ切り出す移行スクリプト。
//
// 分離の理由: Firestoreのルールはフィールド単位の制御ができないため、有料本文が無料本文と
// 同じドキュメントにある限り「無料は全公開・有料は非公開」を実現できない。実際、分離前は
// allow read: if true のまま有料本文まで公開されており、未ログインでも開発者ツールから
// 読めてしまっていた(utils/premiumContent.ts のコメント参照)。
//
// 対象:
//   character-{0..19} … PREMIUM_CHARACTER_FIELDS の8項目を移し、無料側からは削除する
//   kin-{1..260}      … freeText を冒頭125文字までに縮め、残りを premium 側の restText へ
//   tone-{0..12}      … 全項目が無料のため対象外(触らない)
//
// 無料側には表示に必要な派生値だけを残す:
//   premiumCharCount … LockedVeilの「残り○○文字」用。分離後は未権限ユーザーが本文を
//                      読めないので、表示側では数えられなくなるため
//   hasMore (kinのみ) … 続きがあるかどうか。同じ理由で premium の有無から判定できない
//
// Run via: npm run migrate:premium            (real project; requires FIREBASE_SERVICE_ACCOUNT_KEY in .env)
//      or: npm run migrate:premium:emulator   (local Firestore emulator; no credentials needed)
//      --dry-run を付けると書き込まずに件数と差分の概要だけ出す
//
// 冪等: 既に premium 側のドキュメントが存在する ID はスキップする。無料側の削除まで
// 済んだ状態で再実行しても二重に切り詰めることはない(kin の freeText を再度125文字で
// 切っても結果は変わらないが、restText を失わないようスキップ側で守っている)。
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import {
  PREMIUM_CHARACTER_FIELDS,
  countPremiumChars,
  splitKinText
} from '../utils/premiumContent'

const projectId = process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5'

let app
if (process.env.FIRESTORE_EMULATOR_HOST) {
  app = getApps().length ? getApps()[0] : initializeApp({ projectId })
} else {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  if (!serviceAccountKey) {
    console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env, or run against the emulator via `npm run migrate:premium:emulator`.')
    process.exit(1)
  }
  app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
}

const db = getFirestore(app)
const dryRun = process.argv.includes('--dry-run')

interface Counts { moved: number; skipped: number; absent: number }

async function migrateCharacters(): Promise<Counts> {
  const counts: Counts = { moved: 0, skipped: 0, absent: 0 }

  for (let index = 0; index < 20; index++) {
    const id = `character-${index}`
    const freeRef = db.collection('diagnosisContent').doc(id)
    const premiumRef = db.collection('diagnosisContentPremium').doc(id)

    const [freeSnap, premiumSnap] = await Promise.all([freeRef.get(), premiumRef.get()])
    if (!freeSnap.exists) { counts.absent++; continue }
    if (premiumSnap.exists) { counts.skipped++; continue }

    const data = freeSnap.data() as Record<string, unknown>
    const premiumFields: Record<string, unknown> = {}
    for (const key of PREMIUM_CHARACTER_FIELDS) {
      if (data[key] !== undefined) premiumFields[key] = data[key]
    }

    const charCount = countPremiumChars(data)
    if (dryRun) {
      console.log(`  [dry-run] ${id}: ${Object.keys(premiumFields).length}項目 / ${charCount}文字 を移動`)
      counts.moved++
      continue
    }

    // 無料側からの削除と有料側への作成をひとつのバッチにする。片方だけ通ると
    // 本文が消えるか、公開されたままになるかのどちらかになるため。
    const batch = db.batch()
    batch.set(premiumRef, {
      type: 'character',
      index,
      ...premiumFields,
      updatedAt: FieldValue.serverTimestamp()
    })
    const removals: Record<string, unknown> = { premiumCharCount: charCount, updatedAt: FieldValue.serverTimestamp() }
    for (const key of PREMIUM_CHARACTER_FIELDS) removals[key] = FieldValue.delete()
    batch.update(freeRef, removals)
    await batch.commit()
    counts.moved++
  }
  return counts
}

async function migrateKins(): Promise<Counts> {
  const counts: Counts = { moved: 0, skipped: 0, absent: 0 }

  for (let index = 1; index <= 260; index++) {
    const id = `kin-${index}`
    const freeRef = db.collection('diagnosisContent').doc(id)
    const premiumRef = db.collection('diagnosisContentPremium').doc(id)

    const [freeSnap, premiumSnap] = await Promise.all([freeRef.get(), premiumRef.get()])
    if (!freeSnap.exists) { counts.absent++; continue }
    if (premiumSnap.exists) { counts.skipped++; continue }

    const data = freeSnap.data() as { freeText?: string }
    const { freeText, restText } = splitKinText(data.freeText ?? '')

    if (dryRun) {
      console.log(`  [dry-run] ${id}: 無料 ${[...freeText].length}文字 / 有料 ${restText.length}文字`)
      counts.moved++
      continue
    }

    const batch = db.batch()
    // 続きが無いKINでも premium ドキュメントは作る — 作らないと、次回実行時に
    // 「未移行」と誤判定されて freeText を再度切ってしまう(冪等性の担保)。
    batch.set(premiumRef, {
      type: 'kin',
      index,
      restText,
      updatedAt: FieldValue.serverTimestamp()
    })
    batch.update(freeRef, {
      freeText,
      hasMore: restText.length > 0,
      premiumCharCount: restText.trimStart().length,
      updatedAt: FieldValue.serverTimestamp()
    })
    await batch.commit()
    counts.moved++
  }
  return counts
}

function report(label: string, c: Counts) {
  console.log(`${label}: ${c.moved} 件を移行 / ${c.skipped} 件は移行済みでスキップ / ${c.absent} 件は未作成`)
}

async function main() {
  if (dryRun) console.log('※ --dry-run: 書き込みは行いません\n')
  console.log('▸ character-* の有料項目を分離...')
  const characters = await migrateCharacters()
  console.log('▸ kin-* の本文を125文字で分割...')
  const kins = await migrateKins()

  console.log('')
  report('character', characters)
  report('kin', kins)
  console.log('tone: 全項目が無料のため対象外')
  if (!dryRun) {
    console.log('\n完了。firestore.rules のデプロイ(firebase deploy --only firestore:rules)を忘れずに。')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
