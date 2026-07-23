// One-time manual seed for the `diagnosisContent` Firestore collection.
// Run via: npm run seed:content (add --force to overwrite existing docs)
// Requires FIREBASE_SERVICE_ACCOUNT_KEY in .env — see CLAUDE.md / server/utils/firebaseAdmin.ts.
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { SEALS, TONES } from '../utils/mayaData'

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env before running this script.')
  process.exit(1)
}

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) })
const db = getFirestore(app)
const force = process.argv.includes('--force')

// ウェイブスペル20件分のプレースホルダー本文。既存 useDiagnosis.ts のテンプレート文言を踏襲した仮執筆。
// 管理画面で確認・書き直した上で「公開」に切り替える想定のため status: 下書き で登録する。
const WAVESPELL_TEXT: string[] = SEALS.map(
  (seal) => `${seal.essence} この紋章が導くウェイブスペルは、まだ見ぬ可能性として、あなたの潜在意識の奥に眠っています。`
)

// 銀河の音13件分のプレースホルダー本文。各音の keyword を元にした仮執筆。status: 下書き。
const TONE_TEXT: string[] = [
  '磁気の音を持つあなたは、物事の始まりに強く、目的を定めて人や物事を引き寄せる力を持っています。目標が定まったとき、大きな推進力を発揮します。',
  '月の音を持つあなたは、困難や課題から目をそらさずに向き合う忍耐力を持っています。二極の間で揺れながらも、着実にバランスを見出していきます。',
  '電気の音を持つあなたは、周囲を活気づけるエネルギーを持ち、滞った物事に風を通すように状況を動かしていきます。',
  '自己存在の音を持つあなたは、思い描いたものを具体的な形にしていく力に長けています。地道な積み重ねを厭わない実直さが持ち味です。',
  '倍音の音を持つあなたは、自分らしさを発揮することで自然と周囲に影響を与える力を持っています。無理に主張せずとも、その存在感が人を動かします。',
  '律動の音を持つあなたは、物事の均衡を見極め、過不足のない状態へと整えていく力を持っています。公平さを大切にする調整役です。',
  '共振の音を持つあなたは、周囲の人や場の空気と自然に響き合う感性を持っています。誰かと心を通わせることで、本来の力を発揮します。',
  '銀河の音を持つあなたは、異なる要素をまとめ上げ、調和のとれた全体へと統合していく力を持っています。多様な視点を橋渡しする存在です。',
  '太陽の音を持つあなたは、思い描いた意図をはっきりと現実に結びつけていく力を持っています。周囲を照らすような達成力が持ち味です。',
  '惑星の音を持つあなたは、これまで積み重ねてきたものを、目に見える成果として現実に顕在化させる力を持っています。着地させる力に優れています。',
  'スペクトルの音を持つあなたは、不要になった枠組みや執着を手放し、自由になっていく力を持っています。しがらみを解き放つことで軽やかさを得ます。',
  '水晶の音を持つあなたは、自分の力を惜しみなく差し出し、他者と協力し合うことで大きな成果を生み出す力を持っています。分かち合いを大切にします。',
  '宇宙の音を持つあなたは、コントロールを手放し、大いなる流れに身を委ねることで物事を成就させていく力を持っています。静かな確信をもって物事を見守ります。'
]

interface SeedDoc {
  id: string
  type: 'sun' | 'wavespell' | 'tone'
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
}

function buildDocs(): SeedDoc[] {
  const docs: SeedDoc[] = []
  SEALS.forEach((seal, i) => {
    // 既存の本文（SEALS[i].essence）をそのまま流用。既に本番表示されている文言なので公開のまま登録。
    docs.push({ id: `sun-${i}`, type: 'sun', index: i, name: seal.name, freeText: seal.essence, premiumText: '', status: '公開' })
  })
  SEALS.forEach((seal, i) => {
    docs.push({ id: `wavespell-${i}`, type: 'wavespell', index: i, name: seal.name, freeText: WAVESPELL_TEXT[i], premiumText: '', status: '下書き' })
  })
  TONES.forEach((tone, i) => {
    docs.push({ id: `tone-${i}`, type: 'tone', index: i, name: tone.name, freeText: TONE_TEXT[i], premiumText: '', status: '下書き' })
  })
  return docs
}

async function main() {
  const docs = buildDocs()
  const collectionRef = db.collection('diagnosisContent')
  const batch = db.batch()
  let written = 0
  let skipped = 0

  for (const seedDoc of docs) {
    const ref = collectionRef.doc(seedDoc.id)
    if (!force) {
      const existing = await ref.get()
      if (existing.exists) {
        skipped++
        continue
      }
    }
    const { id, ...data } = seedDoc
    batch.set(ref, { ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
    written++
  }

  await batch.commit()
  console.log(`Seed complete: ${written} written, ${skipped} skipped (already existed — pass --force to overwrite).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
