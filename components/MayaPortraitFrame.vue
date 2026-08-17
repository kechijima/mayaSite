<script setup lang="ts">
// Same full-body cutout as MayaPortrait, but top-anchored inside a fixed-aspect-ratio frame —
// 親(.kinduo__art / .dossier__portrait)が枠の大きさとアスペクト比をCSSで与える。
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; gender?: Gender }>(), { gender: 'female' })
const { cutoutSrc } = useSealCutouts()
const src = computed(() => cutoutSrc(props.sealIndex, props.gender))
</script>

<template>
  <img :src="src" alt="" decoding="async" />
</template>
