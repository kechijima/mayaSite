import { doc, getDoc, type Firestore } from 'firebase/firestore'
import type { KinCelebrity } from '~/utils/kinCelebrities'

// docs/診断結果マスタ.xlsx 由来の深掘り項目のうち、`character-*` の**無料**項目
// (マスタ1〜14行目)。すべてoptionalなのは、古い/未シードのドキュメントにまだ無い場合が
// あるため — 呼び出し側は必ずフォールバックすること。
// 有料項目(マスタ15行目以降)はこのインターフェースには含まれない。別コレクション
// diagnosisContentPremium に分離され、CharacterPremiumFields として型付けされている
// (下記および utils/premiumContent.ts 参照) — Firestoreのルールがフィールド単位の
// 制御をできない以上、コレクションを分けなければ有料本文を守れないため。
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
}

// diagnosisContentPremium/character-{i} が持つ有料項目。項目の一覧は
// utils/premiumContent.ts の PREMIUM_CHARACTER_FIELDS と一致していること
// (移行スクリプトと管理画面もそちらを参照している)。
export interface CharacterPremiumFields {
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
  // 以下は有料項目を別コレクションへ分離した際に無料側へ残した派生値
  // (scripts/splitPremiumContent.ts が書き込む)。
  premiumCharCount?: number // LockedVeilの「残り○○文字」用
  hasMore?: boolean // kin-* のみ。続きが有料側にあるか
}

// diagnosisContentPremium のドキュメント。character-* は CharacterPremiumFields を、
// kin-* は restText(本文の126文字目以降)を持つ。
export interface DiagnosisContentPremiumDoc extends CharacterPremiumFields {
  type: 'character' | 'kin'
  index: number
  restText?: string // kin-* のみ
}

export async function fetchPublishedDoc(firestore: Firestore, id: string): Promise<DiagnosisContentDoc | null> {
  const snap = await getDoc(doc(firestore, 'diagnosisContent', id))
  if (!snap.exists()) return null
  const data = snap.data() as DiagnosisContentDoc
  return data.status === '公開' ? data : null
}

// 有料ドキュメントの取得。閲覧権限が無ければFirestoreのルールが permission-denied を
//返すので、それは「読めなかった」= null として正常系に畳む。呼び出し側は権限判定
// (useEntitlement)を見て取得可否を決めているが、判定と実際の読み取りの間で権限が
// 変わる可能性があるため、ここでも握りつぶして画面が壊れないようにしておく。
// なお公開状態(status)は無料側ドキュメントだけが持つ — 有料側は無料側と対で
// 存在するので、非公開なら呼び出し側が無料側を見た時点で弾かれる。
export async function fetchPremiumDoc(firestore: Firestore, id: string): Promise<DiagnosisContentPremiumDoc | null> {
  try {
    const snap = await getDoc(doc(firestore, 'diagnosisContentPremium', id))
    return snap.exists() ? (snap.data() as DiagnosisContentPremiumDoc) : null
  } catch (err) {
    if ((err as { code?: string })?.code === 'permission-denied') return null
    throw err
  }
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
  // 有料ドキュメントは権限がある時だけ取りに行く。権限が無いユーザーの分まで毎回
  // 読みに行くと、必ず失敗する読み取りを3件発生させたうえでコンソールに
  // permission-denied が並ぶだけで、得るものが何もないため。
  // 単体購入は KIN ごとに解放範囲が違うので、ドキュメント単位で canRead を見る
  // (firestore.rules の isEntitledFor(docId) と同じ判定)。
  const { canRead, unlockKey } = useEntitlement()

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
      const premiumIfReadable = (id: string) => (canRead(id) ? fetchPremiumDoc(firestore, id) : Promise.resolve(null))
      const [sunPremium, wavespellPremium, kinPremium] = await Promise.all([
        premiumIfReadable(`character-${sealIndex.value}`),
        premiumIfReadable(`character-${wavespellSealIndex.value}`),
        premiumIfReadable(`kin-${kin.value}`)
      ])
      return { sunDoc, wavespellDoc, toneDoc, kinDoc, sunPremium, wavespellPremium, kinPremium }
    },
    { server: false, lazy: true, watch: [sealIndex, wavespellSealIndex, toneIndex, kin, unlockKey] }
  )

  return {
    sunText: computed(() => data.value?.sunDoc?.freeText || null),
    sunProfile: computed<CharacterProfileFields | null>(() => data.value?.sunDoc ?? null),
    sunPremium: computed<CharacterPremiumFields | null>(() => data.value?.sunPremium ?? null),
    wavespellText: computed(() => data.value?.wavespellDoc?.freeText || null),
    wavespellProfile: computed<CharacterProfileFields | null>(() => data.value?.wavespellDoc ?? null),
    wavespellPremium: computed<CharacterPremiumFields | null>(() => data.value?.wavespellPremium ?? null),
    toneText: computed(() => data.value?.toneDoc?.freeText || null),
    toneProfile: computed<ToneProfileFields | null>(() => data.value?.toneDoc ?? null),
    kinText: computed(() => data.value?.kinDoc?.freeText || null),
    // 続きの有無と残り文字数は無料側ドキュメントの派生値から取る。権限が無いと
    // 有料側を読めない以上、本文の存在から判定することはできない。
    kinHasMore: computed(() => data.value?.kinDoc?.hasMore ?? false),
    kinRestText: computed(() => data.value?.kinPremium?.restText || null),
    kinPremiumCharCount: computed(() => data.value?.kinDoc?.premiumCharCount ?? 0),
    sunPremiumCharCount: computed(() => data.value?.sunDoc?.premiumCharCount ?? 0),
    wavespellPremiumCharCount: computed(() => data.value?.wavespellDoc?.premiumCharCount ?? 0),
    kinCelebrities: computed<KinCelebrity[]>(() => data.value?.kinDoc?.kinCelebrities ?? []),
    pending
  }
}
