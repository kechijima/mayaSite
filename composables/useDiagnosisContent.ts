import { doc, getDoc, type Firestore } from 'firebase/firestore'

// The 18 deep-dive fields sourced from docs/診断結果マスタ.xlsx, present only on `character-*`
// docs (tone docs stay on the plain freeText/premiumText shape below). All optional since
// older/unseeded character docs won't have them yet — every consumer must fall back gracefully.
export interface CharacterProfileFields {
  archetype?: string
  catchphrase?: string
  traits?: string
  careerPath?: string
  likes?: string
  dislikes?: string
  communicationStrengths?: string
  communicationChallenges?: string
  strengthsSummary?: string
  strengthsDetail?: string
  cautionSummary?: string
  cautionDetail?: string
  practicalTips?: string
  bestEnvironment?: string
  bestRole?: string
  loveAndPartnership?: string
  careerSuccess?: string
  luckUpActions?: string
  luckDownHabits?: string
}

export interface DiagnosisContentDoc extends CharacterProfileFields {
  type: 'character' | 'tone'
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
}

async function fetchPublishedDoc(firestore: Firestore, id: string): Promise<DiagnosisContentDoc | null> {
  const snap = await getDoc(doc(firestore, 'diagnosisContent', id))
  if (!snap.exists()) return null
  const data = snap.data() as DiagnosisContentDoc
  return data.status === '公開' ? data : null
}

async function fetchPublishedText(firestore: Firestore, id: string): Promise<string | null> {
  const data = await fetchPublishedDoc(firestore, id)
  return data?.freeText || null
}

export interface DiagnosisContentIndexes {
  sealIndex: Ref<number> // 太陽の紋章 (birth seal)
  wavespellSealIndex: Ref<number> // ウェイブスペル (birth wavespell seal)
  toneIndex: Ref<number> // 銀河の音
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
  const { sealIndex, wavespellSealIndex, toneIndex } = indexes
  const { $firestore } = useNuxtApp()

  const { data, pending } = useAsyncData(
    'diagnosis-content',
    async () => {
      const firestore = $firestore as Firestore
      const [sunDoc, wavespellDoc, toneText] = await Promise.all([
        fetchPublishedDoc(firestore, `character-${sealIndex.value}`),
        fetchPublishedDoc(firestore, `character-${wavespellSealIndex.value}`),
        fetchPublishedText(firestore, `tone-${toneIndex.value}`)
      ])
      return { sunDoc, wavespellDoc, toneText }
    },
    { server: false, lazy: true, watch: [sealIndex, wavespellSealIndex, toneIndex] }
  )

  return {
    sunText: computed(() => data.value?.sunDoc?.freeText || null),
    sunProfile: computed<CharacterProfileFields | null>(() => data.value?.sunDoc ?? null),
    wavespellText: computed(() => data.value?.wavespellDoc?.freeText || null),
    wavespellProfile: computed<CharacterProfileFields | null>(() => data.value?.wavespellDoc ?? null),
    toneText: computed(() => data.value?.toneText ?? null),
    pending
  }
}
