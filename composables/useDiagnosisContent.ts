import { doc, getDoc, type Firestore } from 'firebase/firestore'

export interface DiagnosisContentDoc {
  type: 'sun' | 'wavespell' | 'tone'
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
}

async function fetchPublishedText(firestore: Firestore, id: string): Promise<string | null> {
  const snap = await getDoc(doc(firestore, 'diagnosisContent', id))
  if (!snap.exists()) return null
  const data = snap.data() as DiagnosisContentDoc
  return data.status === '公開' && data.freeText ? data.freeText : null
}

// Fetches CMS-managed body text for the 3 always-free result sections, keyed by the
// already-computed sealIndex/wavespellSealIndex/toneIndex. Client-only (Firestore reads
// aren't needed during SSR here) — callers should treat a null text as "fall back to
// useDiagnosis's built-in template text", not as an error.
export function useDiagnosisContent(sealIndex: Ref<number>, wavespellSealIndex: Ref<number>, toneIndex: Ref<number>) {
  const { $firestore } = useNuxtApp()

  const { data, pending } = useAsyncData(
    'diagnosis-content',
    async () => {
      const firestore = $firestore as Firestore
      const [sunText, wavespellText, toneText] = await Promise.all([
        fetchPublishedText(firestore, `sun-${sealIndex.value}`),
        fetchPublishedText(firestore, `wavespell-${wavespellSealIndex.value}`),
        fetchPublishedText(firestore, `tone-${toneIndex.value}`)
      ])
      return { sunText, wavespellText, toneText }
    },
    { server: false, lazy: true, watch: [sealIndex, wavespellSealIndex, toneIndex] }
  )

  return {
    sunText: computed(() => data.value?.sunText ?? null),
    wavespellText: computed(() => data.value?.wavespellText ?? null),
    toneText: computed(() => data.value?.toneText ?? null),
    pending
  }
}
