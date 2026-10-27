// 到達度診断テストの結果画面に出す「段階」と「フィードバック文」と「購入カード」(2026-10-27)。
//
// 段階は 4 つ。合計点(100点満点なのでそのまま％)にも、カテゴリごとの％(点数 ÷ 20)にも同じ区切りを使う:
//   0: 71％以上 / 1: 51〜70％ / 2: 31〜50％ / 3: 30％以下
// カテゴリの％は 10％刻み(0, 10, … 100)にしかならないので、実際には 80〜100 / 60・70 / 40・50 / 0〜30 で分かれる。
//
// フィードバック文: achievementFeedback/{sealIndex} に紋章ごと、カテゴリ × 段階で 1 本ずつ(20紋章 × 5 × 4 = 400本)。
//   結果画面は各カテゴリの段階の文を出す。空のものは出さない。
// 表示設定: achievementTestSettings/display に1つ。段階ごとの名前と一言(全紋章共通)と、結果画面の下の購入カード。
//   ドキュメントが無い・欠けている項目は DEFAULT_TEST_DISPLAY_SETTINGS で補う。
// どちらも問題文と同じく受けられる人(チーム会員・有料会員)と管理者だけが読める(firestore.rules)。
//
// scripts/ から tsx で読めるよう、~/ ではなく相対 import にしている。
import { CATEGORY_MAX_SCORE, TEST_CATEGORY_KEYS, type TestCategoryKey } from './achievementTest'

export const TEST_CATEGORY_LABEL: Record<TestCategoryKey, string> = {
  thinking: '思考',
  action: '行動',
  relationship: '人間関係',
  belief: '信念',
  skill: 'スキル'
}

export const TEST_BAND_COUNT = 4
// 各段階の下限(この値を含む)。上から順に見て最初に満たしたものがその段階。
export const TEST_BAND_MIN = [71, 51, 31, 0] as const
export const TEST_BAND_RANGE = ['71％以上', '51〜70％', '31〜50％', '30％以下'] as const

export function bandIndexFor(percent: number): number {
  const i = TEST_BAND_MIN.findIndex((min) => percent >= min)
  return i === -1 ? TEST_BAND_COUNT - 1 : i
}

export function categoryPercent(score: number): number {
  return Math.round((score / CATEGORY_MAX_SCORE) * 100)
}

// ---- フィードバック文 -------------------------------------------------------
export type FeedbackTexts = Record<TestCategoryKey, string[]> // 各カテゴリ TEST_BAND_COUNT 本、段階の順

export interface AchievementFeedbackDoc {
  sealIndex: number
  sealName: string
  feedback: FeedbackTexts
  updatedAt?: unknown
}

// 欠けているカテゴリ・段階を空文字で埋めて、必ず 5 × 4 の形にする。
export function normalizeFeedback(feedback: Partial<Record<string, unknown>> | null | undefined): FeedbackTexts {
  const out = {} as FeedbackTexts
  for (const key of TEST_CATEGORY_KEYS) {
    const list = Array.isArray(feedback?.[key]) ? (feedback![key] as unknown[]) : []
    out[key] = Array.from({ length: TEST_BAND_COUNT }, (_, i) => (typeof list[i] === 'string' ? (list[i] as string) : ''))
  }
  return out
}

// ---- 表示設定(段階の名前・一言、購入カード) ----------------------------------
export interface TestBandSetting {
  label: string // 例: 「紋章の力を体現している」
  message: string // 左下で該当段階に添える一言
}

export interface TestProductCard {
  key: 'basic' | 'oracle' | 'guide'
  name: string
  price: number | null // 税込の円。null なら価格を出さない
  url: string // 外部の購入ページ。別タブで開く
  comingSoon: boolean // true ならリンクにせず Coming soon と出す
}

export interface TestDisplaySettings {
  bands: TestBandSetting[]
  products: TestProductCard[]
  updatedAt?: unknown
}

export const TEST_PRODUCT_KEYS: TestProductCard['key'][] = ['basic', 'oracle', 'guide']

export const DEFAULT_TEST_DISPLAY_SETTINGS: TestDisplaySettings = {
  bands: [
    { label: '紋章の力を体現している', message: 'あなたの紋章らしさが、日々の考え方や振る舞いにしっかり根づいています。' },
    { label: '紋章の力が育ってきている', message: '紋章らしさが身につきつつあります。得意なところを足場に、もう一段伸ばしていきましょう。' },
    { label: '紋章の力を磨いている途中', message: 'まだ伸びしろがたっぷりあります。下のフィードバックから、試しやすいものを一つ選んでみてください。' },
    { label: '紋章の力がこれから目覚める', message: 'ここからがスタートです。小さな一歩を重ねるほど、紋章の力は自然と表に出てきます。' }
  ],
  products: [
    { key: 'basic', name: 'ベーシック', price: 5400, url: '', comingSoon: false },
    { key: 'oracle', name: 'オラクル', price: 5400, url: '', comingSoon: false },
    { key: 'guide', name: '到達度テストの攻略ガイド', price: null, url: '', comingSoon: true }
  ]
}

// Firestore から読んだ値を、欠けた項目を既定値で補った完全な形にする。
export function normalizeDisplaySettings(data: Partial<TestDisplaySettings> | null | undefined): TestDisplaySettings {
  const d = DEFAULT_TEST_DISPLAY_SETTINGS
  const bands = d.bands.map((def, i) => {
    const b = data?.bands?.[i]
    return {
      label: typeof b?.label === 'string' ? b.label : def.label,
      message: typeof b?.message === 'string' ? b.message : def.message
    }
  })
  const products = d.products.map((def) => {
    const p = data?.products?.find((x) => x?.key === def.key)
    return {
      key: def.key,
      name: typeof p?.name === 'string' && p.name.trim() ? p.name : def.name,
      price: p && (p.price === null || typeof p.price === 'number') ? p.price : def.price,
      url: typeof p?.url === 'string' ? p.url : def.url,
      comingSoon: typeof p?.comingSoon === 'boolean' ? p.comingSoon : def.comingSoon
    }
  })
  return { bands, products }
}

export function formatYen(price: number): string {
  return `￥${price.toLocaleString('ja-JP')}（税込）`
}

// 外部リンクとして開いてよい URL か(http/https のみ。javascript: などを弾く)。
export function isSafeExternalUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(url.trim())
}
