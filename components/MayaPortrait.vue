<script setup lang="ts">
const props = defineProps<{ sealIndex: number }>()
const { cutoutSrc } = useSealCutouts()
const src = computed(() => cutoutSrc(props.sealIndex))
</script>

<template>
  <div class="dossier__portrait">
    <img :src="src" alt="" />
  </div>
</template>
