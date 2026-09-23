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
import type { LocationQueryValue } from 'vue-router'
import { parseKin } from '~/utils/mayaCalc'
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
