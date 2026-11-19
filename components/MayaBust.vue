<script setup lang="ts">
// Upper-body-only cutout used by KINの関係性's .relcard__figure.
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; alt?: string; gender?: Gender }>(), { gender: 'female' })
const { bustSrc } = useSealCutouts()
const src = computed(() => bustSrc(props.sealIndex, props.gender))

// 2026-11-19: 白い犬・白い魔法使いは顔が大きく見えるため表示で縮めていたが、胸像そのものを
// 体まで入る形に作り直した(scripts/generateSealCutouts.py の BUST_KEEP_MIN)ので縮小はやめた。
</script>

<template>
  <img :src="src" :alt="alt ?? ''" decoding="async" />
</template>
