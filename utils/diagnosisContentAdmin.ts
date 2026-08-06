import { SEALS, TONES } from '~/utils/mayaData'

export type ContentType = 'character' | 'tone' | 'kin'

// 太陽の紋章・ウェイブスペルなど、紋章が登場するすべての場面で共有される
// キャラクター(type: 'character')だけが持つ、docs/診断結果マスタ.xlsx 由来の深掘り項目。
// toneのドキュメントには存在しない(編集ページ側で type==='character' の時だけ表示)。
// tier はマスタの行位置に対応(1〜14行目=free、15行目以降=premium — 詳細は
// scripts/characters.data.ts の2026-08-05コメント参照)。cautionDetailPremium は元々1つの
// セルだった注意すべき傾向(詳細)の後半(15行目)を分離したもの。
export const CHARACTER_PROFILE_FIELDS = [
  { key: 'archetype', label: 'タイプ名', kind: 'text', tier: 'free' },
  { key: 'catchphrase', label: 'キャッチコピー', kind: 'text', tier: 'free' },
  { key: 'traits', label: 'あなたはこんな人', kind: 'textarea', tier: 'free' },
  { key: 'careerPath', label: 'キャリアパス', kind: 'textarea', tier: 'free' },
  { key: 'likes', label: 'あなたが喜ぶこと', kind: 'textarea', tier: 'free' },
  { key: 'dislikes', label: 'あなたが嫌がること', kind: 'textarea', tier: 'free' },
  { key: 'communicationStrengths', label: 'コミュニケーションの強み', kind: 'textarea', tier: 'free' },
  { key: 'communicationChallenges', label: 'コミュニケーションの課題', kind: 'textarea', tier: 'free' },
  { key: 'strengthsSummary', label: 'あなたの性格の強み(要約)', kind: 'textarea', tier: 'free' },
  { key: 'strengthsDetail', label: 'あなたの性格の強み(詳細)', kind: 'textarea', tier: 'free' },
  { key: 'cautionSummary', label: '注意すべき傾向(要約)', kind: 'textarea', tier: 'free' },
  { key: 'cautionDetail', label: '注意すべき傾向(詳細・前半)', kind: 'textarea', tier: 'free' },
  { key: 'cautionDetailPremium', label: '注意すべき傾向(詳細・続き)', kind: 'textarea', tier: 'premium' },
  { key: 'practicalTips', label: '実践的なヒント', kind: 'textarea', tier: 'premium' },
  { key: 'bestEnvironment', label: '人生で一番伸びる環境', kind: 'textarea', tier: 'premium' },
  { key: 'bestRole', label: '人生で一番向いている役割', kind: 'textarea', tier: 'premium' },
  { key: 'loveAndPartnership', label: '恋愛・パートナーシップ', kind: 'textarea', tier: 'premium' },
  { key: 'careerSuccess', label: '仕事で成功する方法', kind: 'textarea', tier: 'premium' },
  { key: 'luckUpActions', label: '運気が上がる行動', kind: 'textarea', tier: 'premium' },
  { key: 'luckDownHabits', label: '運気が下がるクセ', kind: 'textarea', tier: 'premium' }
] as const satisfies { key: string; label: string; kind: 'text' | 'textarea'; tier: 'free' | 'premium' }[]

export type CharacterProfileKey = (typeof CHARACTER_PROFILE_FIELDS)[number]['key']

// 銀河の音(type: 'tone')だけが持つ、docs/銀河の音診断結果マスタ.xlsx 由来の深掘り項目。
// キャラクターと違い無料/有料の分割はない(全項目無料表示)ので tier は持たない。celebrities は
// "name｜birthdate｜kin｜combo" を1行1人でつないだプレーンテキスト — utils/toneCelebrities.ts
// でパース/フォーマットする(配列フィールドをFirestoreスキーマに増やさず、既存のtext/textarea
// のみの編集フォームに収めるための選択)。
export const TONE_PROFILE_FIELDS = [
  { key: 'title', label: '表題', kind: 'text' },
  { key: 'basicSpecs', label: '基本スペック', kind: 'textarea' },
  { key: 'strengths', label: '性格の強み', kind: 'textarea' },
  { key: 'cautions', label: '注意するべき点', kind: 'textarea' },
  { key: 'celebrities', label: '有名人（1行に1人、「名前｜生年月日｜Kinナンバー｜太陽の紋章 × ウェイブスペル」の形式）', kind: 'textarea' }
] as const satisfies { key: string; label: string; kind: 'text' | 'textarea' }[]

export type ToneProfileKey = (typeof TONE_PROFILE_FIELDS)[number]['key']

export interface ContentRow extends Partial<Record<CharacterProfileKey | ToneProfileKey, string>> {
  id: string
  type: ContentType
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
  updated: string
}

// 2026-07-30: 'sun'/'wavespell' の2種類に分かれていたのを 'character' に統合した。紋章は
// 太陽の紋章・ウェイブスペルなど登場する文脈が複数あっても中身は同じ1キャラクター分のプロフィール
// なので、文脈ごとに別ドキュメントを持たせる設計をやめた(旧 wavespell-* は未使用の仮データのまま
// だったため削除)。デイサイン・トレセーナ・古代マヤ暦全書はそもそも表示自体を廃止済み。
//
// 'kin'(KIN番号1〜260, docs/KIN番号診断結果マスタ.xlsx由来)は他2種と違い、紋章プロフィール/
// 銀河の音プロフィールのような専用サブフィールドを持たない単一freeTextのみ — 編集ページ
// (pages/admin/content/[id].vue)では常時表示されるfreeText欄だけで完結する。また index が
// SEALS/TONESのような0始まりではなくKIN番号そのまま(1〜260、result.kinと一致)なので、
// startIndex で1始まりのIDを組み立てる。
export const CONTENT_TYPES: { type: ContentType; label: string; names: string[]; startIndex?: number }[] = [
  { type: 'character', label: 'キャラクター', names: SEALS.map((s) => s.name) },
  { type: 'tone', label: '銀河の音', names: TONES.map((t) => t.name) },
  { type: 'kin', label: 'KIN番号', names: Array.from({ length: 260 }, (_, i) => `KIN${i + 1}`), startIndex: 1 }
]

export function typeLabel(type: ContentType) {
  return CONTENT_TYPES.find((t) => t.type === type)?.label ?? type
}

export function buildContentRows(): ContentRow[] {
  return CONTENT_TYPES.flatMap((ct) =>
    ct.names.map((name, i) => {
      const index = i + (ct.startIndex ?? 0)
      return {
        id: `${ct.type}-${index}`,
        type: ct.type,
        index,
        name,
        freeText: '',
        premiumText: '',
        status: '下書き' as const,
        updated: '—',
        ...(ct.type === 'character' ? Object.fromEntries(CHARACTER_PROFILE_FIELDS.map((f) => [f.key, ''])) : {}),
        ...(ct.type === 'tone' ? Object.fromEntries(TONE_PROFILE_FIELDS.map((f) => [f.key, ''])) : {})
      }
    })
  )
}

// 単一行分のスケルトンを id (例: "character-0") から直接組み立てる。編集ページの初期表示用。
export function buildContentRow(id: string): ContentRow | null {
  return buildContentRows().find((r) => r.id === id) ?? null
}
