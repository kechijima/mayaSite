<script setup lang="ts">
// Same full-body cutout as MayaPortrait, but top-anchored inside a fixed-aspect-ratio frame —
// used by the hero's .kinhero__frame (parent supplies the frame box/aspect-ratio via CSS).
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; gender?: Gender }>(), { gender: 'female' })
const { cutoutSrc } = useSealCutouts()
const src = computed(() => cutoutSrc(props.sealIndex, props.gender))
</script>

<template>
  <img :src="src" alt="" />
</template>
