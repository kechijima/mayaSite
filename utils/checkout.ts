// 購入プランの定義と、決済フロー(/plans → /checkout → /checkout/pay → /checkout/success)で
// ページ間を渡すクエリの組み立て。金額・名称はここが正で、/plans のカードもここを参照する。
//
// 2026-09-23: 決済(Stripe)導入前に「画面と遷移だけ」を作った段階。CLAUDE.md「Payment roadmap
// (Phase 2)」で合意した本番フロー(Stripe Checkout + Cloud Functions)に、後から中身を差し込める
// 形にしてある:
//   /checkout          注文内容の確認。「お支払いへ進む」が Phase 2 では Cloud Function を呼んで
//                      Stripe Checkout のセッションを作り、Stripe のページへ遷移する
//   /checkout/pay      Stripe がホストする決済画面の仮置き。Phase 2 では存在しない(削除する)
//   /checkout/success  Stripe の success_url。Phase 2 では Webhook が users を更新するまで
//                      「反映待ち」を出し、更新を確認してから戻り先へ案内する
// 価格は税込(Phase 2 の合意どおり)。
//
// 2026-09-23: 無料会員には有料エリアを見せず、仮の決済を通ったら見えるようにした。
// 「支払う」は applyMockPurchase() で本人の権限のまま users/{uid}.plan または
// users/{uid}/unlocks を書く(firestore.rules の【決済モック期間限定】分岐)。
// Stripe 導入後はこの書き込みを Cloud Function(Webhook)へ移し、rules の分岐を消す。
import { doc, serverTimestamp, updateDoc, writeBatch, type Firestore } from 'firebase/firestore'
import type { LocationQueryValue } from 'vue-router'
import { destinyKins, kinInfo, parseKin, relationSealIndices } from '~/utils/mayaCalc'
import { safeRedirect } from '~/utils/signupLink'

export type PlanId = 'subscription' | 'single'

export interface PlanDef {
  id: PlanId
  name: string
  price: number
  // 請求の説明。/checkout の注文内容と /checkout/pay の金額表示に使う
  billing: string
  // 単体購入は対象 KIN が必須
  needsKin: boolean
}

export const PLANS: Record<PlanId, PlanDef> = {
  subscription: { id: 'subscription', name: '有料会員', price: 5500, billing: '月額・自動更新', needsKin: false },
  single: { id: 'single', name: 'この記事のみ', price: 550, billing: '1回のお支払い', needsKin: true }
}

export function parsePlan(value: LocationQueryValue | LocationQueryValue[] | undefined): PlanId | null {
  return value === 'subscription' || value === 'single' ? value : null
}

export function formatYen(amount: number): string {
  return `￥${amount.toLocaleString('ja-JP')}`
}

// /checkout 系のページが共通で読むクエリ(plan / kin / redirect)。
export interface CheckoutParams {
  plan: PlanId | null
  kin: number | null
  redirect: string | null
}

export function readCheckoutParams(query: Record<string, LocationQueryValue | LocationQueryValue[]>): CheckoutParams {
  return {
    plan: parsePlan(query.plan),
    kin: parseKin(query.kin),
    redirect: safeRedirect(query.redirect)
  }
}

// plan が無い、または単体購入なのに kin が無い場合は注文として成立しない。
export function isValidOrder(p: CheckoutParams): p is CheckoutParams & { plan: PlanId } {
  if (!p.plan) return false
  return !PLANS[p.plan].needsKin || p.kin !== null
}

function withParams(path: string, entries: Record<string, string | number | null | undefined>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(entries)) {
    if (v !== null && v !== undefined && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

export function buildCheckoutLink(plan: PlanId, kin: number | null, redirect: string | null): string {
  return withParams('/checkout', { plan, kin: PLANS[plan].needsKin ? kin : null, redirect })
}

export function buildPayLink(p: CheckoutParams & { plan: PlanId }): string {
  return withParams('/checkout/pay', { plan: p.plan, kin: p.kin, redirect: p.redirect })
}

export function buildSuccessLink(p: CheckoutParams & { plan: PlanId }): string {
  return withParams('/checkout/success', { plan: p.plan, kin: p.kin, redirect: p.redirect })
}

// プラン選択へ戻る。canceled は Stripe の cancel_url 相当(/plans が「キャンセルされました」を出す)。
export function buildPlansLink(kin: number | null, redirect: string | null, canceled = false): string {
  return withParams('/plans', { kin, redirect, canceled: canceled ? 1 : null })
}

// KIN N の記事の単体購入で解放される diagnosisContentPremium のドキュメントID(CLAUDE.md Phase 2 の
// 合意): KIN N の手紙、太陽の紋章とウェイブスペルの character、result.vue から辿れる関係性 4 紋章の
// character、運命数字 5 つの kin(N 自身を含む)。重複は除く。
// firestore.rules は users/{uid}/unlocks/{docId} の exists() で判定するので、ここで列挙した ID が
// そのまま「読めるドキュメント」になる。
export function unlockDocIdsForKin(kin: number): string[] {
  const info = kinInfo(kin)
  const ids = new Set<string>([`kin-${kin}`, `character-${info.sealIndex}`, `character-${info.wavespellSealIndex}`])
  for (const sealIndex of relationSealIndices(kin)) ids.add(`character-${sealIndex}`)
  for (const k of destinyKins(kin)) ids.add(`kin-${k}`)
  return [...ids]
}

// 【決済モック期間限定】仮の決済画面の「支払う」。本人の権限で解放を書き込む。
//   有料会員     → users/{uid}.plan = 'paid'
//   この記事のみ → users/{uid}/purchases/kin-{N}(記録)と users/{uid}/unlocks/{docId}(解放)を1バッチで
// Stripe 導入後はこの関数を呼ばず、Webhook がサーバー側で同じ書き込みをする。
export async function applyMockPurchase(firestore: Firestore, uid: string, order: CheckoutParams & { plan: PlanId }) {
  if (order.plan === 'subscription') {
    await updateDoc(doc(firestore, 'users', uid), { plan: 'paid', paidAt: serverTimestamp() })
    return
  }
  const kin = order.kin as number
  const unlocks = unlockDocIdsForKin(kin)
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, 'users', uid, 'purchases', `kin-${kin}`), {
    kin,
    price: PLANS.single.price,
    unlocks,
    createdAt: serverTimestamp()
  })
  for (const id of unlocks) {
    batch.set(doc(firestore, 'users', uid, 'unlocks', id), { kin, purchasedAt: serverTimestamp() })
  }
  await batch.commit()
}

// 【決済モック期間限定】マイページの「解約する(仮)」。Stripe 導入後は Customer Portal に置き換わる。
export async function cancelMockSubscription(firestore: Firestore, uid: string) {
  await updateDoc(doc(firestore, 'users', uid), { plan: 'free', paidAt: null })
}
