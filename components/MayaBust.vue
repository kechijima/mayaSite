<script setup lang="ts">
// Upper-body-only cutout used by KINの関係性's .relcard__figure.
import type { Gender } from '~/utils/gender'

const props = withDefaults(defineProps<{ sealIndex: number; alt?: string; gender?: Gender }>(), { gender: 'female' })
const { bustSrc } = useSealCutouts()
const src = computed(() => bustSrc(props.sealIndex, props.gender))
</script>

<template>
  <img :src="src" :alt="alt ?? ''" />
</template>
