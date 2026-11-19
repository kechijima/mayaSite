<script setup lang="ts">
// Upper-body-only cutout used by KINの関係性's .relcard__figure.
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; alt?: string; gender?: Gender }>(), { gender: 'female' })
const { bustSrc } = useSealCutouts()
const src = computed(() => bustSrc(props.sealIndex, props.gender))

// 紋章ごとの縮小率(2026-11-19 要望)。胸像は同じ枠に同じ幅で出すので、切り抜きの詰まり方で顔の大きさが
// 揃わない。白い犬(9)は顔が大きく見えるので縮め、白い魔法使い(13)も小さくする(帽子が切れてもよい)。
// 下端(肩)を枠の下にそろえたまま縮めるので、上の帽子や耳は枠の上に収まる。
const BUST_SCALE: Record<number, number> = { 9: 0.8, 13: 0.84 }
const style = computed(() => {
  const k = BUST_SCALE[props.sealIndex]
  return k ? { transform: `scale(${k})`, transformOrigin: 'bottom center' } : undefined
})
</script>

<template>
  <img :src="src" :alt="alt ?? ''" :style="style" decoding="async" />
</template>
