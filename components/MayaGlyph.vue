<script setup lang="ts">
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; gender?: Gender; size?: 'md' | 'lg' | 'xl' }>(), {
  gender: 'female',
  size: 'md'
})

// Face-centered crops derived from the full-body portraits — assets/images/faces/seal-*.webp
// (female, hand-made) and seal-*-male.webp (male, scripts/generateSealFacesMale.py).
// Same male/female convention as the cutouts (composables/useSealCutouts.ts): the female set is
// unsuffixed and is the fallback, so a missing male file never renders a broken image.
const modules = import.meta.glob('~/assets/images/faces/seal-*.webp', { eager: true, import: 'default' }) as Record<string, string>
const IMAGE_BY_INDEX: string[] = []
const IMAGE_BY_INDEX_MALE: string[] = []
for (const [path, url] of Object.entries(modules)) {
  const maleMatch = path.match(/seal-(\d+)-male\.webp$/)
  if (maleMatch) {
    IMAGE_BY_INDEX_MALE[Number(maleMatch[1])] = url
    continue
  }
  const match = path.match(/seal-(\d+)\.webp$/)
  if (match) IMAGE_BY_INDEX[Number(match[1])] = url
}

const src = computed(() =>
  (props.gender === 'male' ? IMAGE_BY_INDEX_MALE[props.sealIndex] : undefined) ?? IMAGE_BY_INDEX[props.sealIndex]
)
const dims: Record<string, number> = { md: 58, lg: 76, xl: 104 }
const size = computed(() => dims[props.size])
</script>

<template>
  <span class="medal__ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <img :src="src" alt="" decoding="async" />
  </span>
</template>
