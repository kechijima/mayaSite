// 利用規約・プライバシーポリシー・特定商取引法に基づく表記で共通に使う運営者情報と日付。
// 3ページで食い違わないよう、運営者名・連絡先・制定日はここだけで管理する。
// 「（準備中）」のものは決まりしだいここを書き換える(各ページ側は触らなくてよい)。
// 価格は utils/checkout.ts の PLANS を各ページが直接参照する(二重管理しない)。

export const PENDING = '（準備中）'

export const OPERATOR = {
  /** サイト名(規約上の「本サービス」の呼び名) */
  serviceName: 'JMBマヤ暦 無料診断',
  /** 運営者名。フッターの著作権表示と同じ名義 */
  name: 'マヤ暦実行委員会',
  representative: PENDING,
  address: PENDING,
  phone: PENDING,
  email: PENDING
} as const

export interface LegalDates {
  enacted: string
  revised?: string
}

// 制定日は公開(本番デプロイ)した日に合わせる。改定したら revised を足す。
export const TERMS_DATES: LegalDates = { enacted: '2026年11月11日' }
export const PRIVACY_DATES: LegalDates = { enacted: '2026年11月11日' }

/** 規約類の相互リンク(各ページ末尾・フッター) */
export const LEGAL_LINKS = [
  { to: '/legal/terms', label: '利用規約' },
  { to: '/legal/privacy', label: 'プライバシーポリシー' },
  { to: '/legal/tokushoho', label: '特定商取引法に基づく表記' }
] as const

/** 規約の1条。body の文字列は段落、配列は番号付きの項(1. 2. …)、{ bullets } は箇条書き */
export type LegalBlock = string | string[] | { bullets: string[] }
export interface LegalSection {
  heading: string
  body: LegalBlock[]
}
