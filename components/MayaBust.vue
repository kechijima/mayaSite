<script setup lang="ts">
// Upper-body-only cutout used by KINの関係性's .relcard__figure.
const props = defineProps<{ sealIndex: number; alt?: string }>()
const { bustSrc } = useSealCutouts()
const src = computed(() => bustSrc(props.sealIndex))
</script>

<template>
  <img :src="src" :alt="alt ?? ''" />
</template>
