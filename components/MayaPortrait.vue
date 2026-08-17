<script setup lang="ts">
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; gender?: Gender }>(), { gender: 'female' })
const { cutoutSrc } = useSealCutouts()
const src = computed(() => cutoutSrc(props.sealIndex, props.gender))
</script>

<template>
  <div class="dossier__portrait">
    <img :src="src" alt="" decoding="async" />
  </div>
</template>
