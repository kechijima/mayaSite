import type { Firestore } from 'firebase/firestore'
import { fetchPublishedDoc } from '~/composables/useDiagnosisContent'

// 紋章のタイプ名(「修道士タイプ」など)。CMS の diagnosisContent/character-{n}.archetype から読む
// (誰でも読める無料側)。ピッタリ到達度テストの見出しと結果画面で紋章名に添える(2026-11-19 要望)。
// 読めない・未公開なら空文字で、紋章名だけの表示になる。
export function useSealArchetype(sealIndex: Ref<number | null | undefined>) {
  const archetype = ref('')
  watch(
    sealIndex,
    async (i) => {
      archetype.value = ''
      if (i === null || i === undefined) return
      try {
        const doc = await fetchPublishedDoc(useNuxtApp().$firestore as Firestore, `character-${i}`)
        if (sealIndex.value === i) archetype.value = doc?.archetype?.trim() ?? ''
      } catch {
        // タイプ名は添え物なので、読めなくても画面は止めない
      }
    },
    { immediate: true }
  )
  return archetype
}
