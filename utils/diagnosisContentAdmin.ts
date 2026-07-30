import { SEALS, TONES } from '~/utils/mayaData'

export type ContentType = 'character' | 'tone'

// 太陽の紋章・ウェイブスペルなど、紋章が登場するすべての場面で共有される
// キャラクター(type: 'character')だけが持つ、docs/診断結果マスタ.xlsx 由来の深掘り項目。
// toneのドキュメントには存在しない(編集ページ側で type==='character' の時だけ表示)。
export const CHARACTER_PROFILE_FIELDS = [
  { key: 'archetype', label: 'タイプ名', kind: 'text' },
  { key: 'catchphrase', label: 'キャッチコピー', kind: 'text' },
  { key: 'traits', label: 'あなたはこんな人', kind: 'textarea' },
  { key: 'careerPath', label: 'キャリアパス', kind: 'textarea' },
  { key: 'likes', label: 'あなたが喜ぶこと', kind: 'textarea' },
  { key: 'dislikes', label: 'あなたが嫌がること', kind: 'textarea' },
  { key: 'communicationStrengths', label: 'コミュニケーションの強み', kind: 'textarea' },
  { key: 'communicationChallenges', label: 'コミュニケーションの課題', kind: 'textarea' },
  { key: 'strengthsSummary', label: 'あなたの性格の強み(要約)', kind: 'textarea' },
  { key: 'strengthsDetail', label: 'あなたの性格の強み(詳細)', kind: 'textarea' },
  { key: 'cautionSummary', label: '注意すべき傾向(要約)', kind: 'textarea' },
  { key: 'cautionDetail', label: '注意すべき傾向(詳細)', kind: 'textarea' },
  { key: 'practicalTips', label: '実践的なヒント', kind: 'textarea' },
  { key: 'bestEnvironment', label: '人生で一番伸びる環境', kind: 'textarea' },
  { key: 'bestRole', label: '人生で一番向いている役割', kind: 'textarea' },
  { key: 'loveAndPartnership', label: '恋愛・パートナーシップ', kind: 'textarea' },
  { key: 'careerSuccess', label: '仕事で成功する方法', kind: 'textarea' },
  { key: 'luckUpActions', label: '運気が上がる行動', kind: 'textarea' },
  { key: 'luckDownHabits', label: '運気が下がるクセ', kind: 'textarea' }
] as const satisfies { key: string; label: string; kind: 'text' | 'textarea' }[]

export type CharacterProfileKey = (typeof CHARACTER_PROFILE_FIELDS)[number]['key']

export interface ContentRow extends Partial<Record<CharacterProfileKey, string>> {
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
export const CONTENT_TYPES: { type: ContentType; label: string; names: string[] }[] = [
  { type: 'character', label: 'キャラクター', names: SEALS.map((s) => s.name) },
  { type: 'tone', label: '銀河の音', names: TONES.map((t) => t.name) }
]

export function typeLabel(type: ContentType) {
  return CONTENT_TYPES.find((t) => t.type === type)?.label ?? type
}

export function buildContentRows(): ContentRow[] {
  return CONTENT_TYPES.flatMap((ct) =>
    ct.names.map((name, index) => ({
      id: `${ct.type}-${index}`,
      type: ct.type,
      index,
      name,
      freeText: '',
      premiumText: '',
      status: '下書き' as const,
      updated: '—',
      ...(ct.type === 'character' ? Object.fromEntries(CHARACTER_PROFILE_FIELDS.map((f) => [f.key, ''])) : {})
    }))
  )
}

// 単一行分のスケルトンを id (例: "character-0") から直接組み立てる。編集ページの初期表示用。
export function buildContentRow(id: string): ContentRow | null {
  return buildContentRows().find((r) => r.id === id) ?? null
}
