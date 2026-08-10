<script setup lang="ts">
// Same full-body cutout as MayaPortrait, but top-anchored inside a fixed-aspect-ratio frame —
// used by the hero's .kinhero__frame (parent supplies the frame box/aspect-ratio via CSS).
const props = defineProps<{ sealIndex: number }>()
const { cutoutSrc } = useSealCutouts()
const src = computed(() => cutoutSrc(props.sealIndex))
</script>

<template>
  <img :src="src" alt="" />
</template>
