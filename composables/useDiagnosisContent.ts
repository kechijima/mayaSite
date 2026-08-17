import { doc, getDoc, type Firestore } from 'firebase/firestore'
import type { KinCelebrity } from '~/utils/kinCelebrities'

// The 19 deep-dive fields sourced from docs/診断結果マスタ.xlsx, present only on `character-*`
// docs (tone docs have their own, smaller field set — see ToneProfileFields below). All optional
// since older/unseeded character docs won't have them yet — every consumer must fall back
// gracefully. Free/paid split follows the master's own row layout (1〜14行目=無料, 15行目以降=
// 有料— see scripts/characters.data.ts's header comment): careerPath through cautionDetail are
// free; cautionDetailPremium (row 15, the back half of a single source cell split at its row
// boundary) through luckDownHabits are gated — see pages/result.vue's freeProfileSections /
// premiumProfileSections.
export interface CharacterProfileFields {
  archetype?: string
  catchphrase?: string
  // 2026-08-10: 純粋な箇条書きのみのフィールドは string[] — モックアップのチェックリスト表示
  // (項目ごとにi-checkアイコン)に対応するため。strengthsSummary/cautionSummaryはプレーンな
  // 文章のstrengthsDetail/cautionDetailと連結して1セクションとして表示するため、
  // pages/result.vue側で「チェックリスト(summary) + 段落(detail)」の複合レンダリングにして
  // いる。文章と箇条書きが混在するフィールド(bestEnvironment/bestRole/luckDownHabits)は対象外
  // で、引き続き "・" 区切りの単一文字列のまま — pages/result.vueでは従来通りpre-line表示する。
  traits?: string[]
  careerPath?: string
  likes?: string[]
  dislikes?: string[]
  communicationStrengths?: string[]
  communicationChallenges?: string[]
  strengthsSummary?: string[]
  strengthsDetail?: string
  cautionSummary?: string[]
  cautionDetail?: string
  cautionDetailPremium?: string
  practicalTips?: string[]
  bestEnvironment?: string
  bestRole?: string
  loveAndPartnership?: string
  careerSuccess?: string
  luckUpActions?: string[]
  luckDownHabits?: string
}

// 銀河の音(type: 'tone')だけが持つ、docs/銀河の音診断結果マスタ.xlsx由来の深掘り項目。
// celebrities は配列ではなく "name｜birthdate｜kin｜combo" を1行1人でつないだ文字列
// (utils/toneCelebrities.ts でパース/フォーマット) — 理由はそちらのコメント参照。
export interface ToneProfileFields {
  title?: string
  // 2026-08-10: 純粋な箇条書きのみのフィールドなので string[] — 詳細は上のCharacterProfileFields
  // のコメント参照。
  basicSpecs?: string[]
  strengths?: string[]
  cautions?: string[]
  celebrities?: string
}

// KIN別の有名人(docs/芸能人マスタ.xlsx由来、scripts/seedCelebrities.ts で kin-* に投入)。
// 銀河の音の celebrities が "name｜birthdate｜kin｜combo" の区切り文字列なのに対しこちらは
// 配列 — KIN側は kin がドキュメントIDと重複し、combo(紋章の組み合わせ)も同じKINなら全員
// 同じで情報にならないため、素直な形にしてパース処理も不要にしている。
// フィールド名を celebrities ではなく kinCelebrities としているのは、tone-* の
// ToneProfileFields.celebrities(string)と同じ名前だと、両方を1つにまとめている
// DiagnosisContentDoc で型が衝突するため(string と配列は両立できない)。
// 型と、管理画面用のテキスト相互変換は utils/kinCelebrities.ts にある。
export type { KinCelebrity } from '~/utils/kinCelebrities'

export interface DiagnosisContentDoc extends CharacterProfileFields, ToneProfileFields {
  type: 'character' | 'tone' | 'kin'
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
  kinCelebrities?: KinCelebrity[] // kin-* のみ
}

async function fetchPublishedDoc(firestore: Firestore, id: string): Promise<DiagnosisContentDoc | null> {
  const snap = await getDoc(doc(firestore, 'diagnosisContent', id))
  if (!snap.exists()) return null
  const data = snap.data() as DiagnosisContentDoc
  return data.status === '公開' ? data : null
}

export interface DiagnosisContentIndexes {
  sealIndex: Ref<number> // 太陽の紋章 (birth seal)
  wavespellSealIndex: Ref<number> // ウェイブスペル (birth wavespell seal)
  toneIndex: Ref<number> // 銀河の音
  kin: Ref<number> // KIN番号 (1-260, not 0-based like the indexes above)
}

// Fetches CMS-managed body text for the result page's seal-description sections. Both
// seal-based sections (太陽の紋章/ウェイブスペル) read from the same `character-{sealIndex}`
// docs — there's only one real, CMS-authored profile per character (from
// docs/診断結果マスタ.xlsx), so every place a seal appears reuses it rather than maintaining
// parallel per-context copies (this collection used to be split into `sun-*`/`wavespell-*`;
// unified into `character-*` on 2026-07-30 — see scripts/characters.data.ts).
// Client-only (Firestore reads aren't needed during SSR here) — callers should treat a null
// value as "fall back to useDiagnosis's built-in template text", not as an error.
export function useDiagnosisContent(indexes: DiagnosisContentIndexes) {
  const { sealIndex, wavespellSealIndex, toneIndex, kin } = indexes
  const { $firestore } = useNuxtApp()

  const { data, pending } = useAsyncData(
    'diagnosis-content',
    async () => {
      const firestore = $firestore as Firestore
      const [sunDoc, wavespellDoc, toneDoc, kinDoc] = await Promise.all([
        fetchPublishedDoc(firestore, `character-${sealIndex.value}`),
        fetchPublishedDoc(firestore, `character-${wavespellSealIndex.value}`),
        fetchPublishedDoc(firestore, `tone-${toneIndex.value}`),
        fetchPublishedDoc(firestore, `kin-${kin.value}`)
      ])
      return { sunDoc, wavespellDoc, toneDoc, kinDoc }
    },
    { server: false, lazy: true, watch: [sealIndex, wavespellSealIndex, toneIndex, kin] }
  )

  return {
    sunText: computed(() => data.value?.sunDoc?.freeText || null),
    sunProfile: computed<CharacterProfileFields | null>(() => data.value?.sunDoc ?? null),
    wavespellText: computed(() => data.value?.wavespellDoc?.freeText || null),
    wavespellProfile: computed<CharacterProfileFields | null>(() => data.value?.wavespellDoc ?? null),
    toneText: computed(() => data.value?.toneDoc?.freeText || null),
    toneProfile: computed<ToneProfileFields | null>(() => data.value?.toneDoc ?? null),
    kinText: computed(() => data.value?.kinDoc?.freeText || null),
    kinCelebrities: computed<KinCelebrity[]>(() => data.value?.kinDoc?.kinCelebrities ?? []),
    pending
  }
}
