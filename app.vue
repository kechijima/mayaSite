<script setup lang="ts">
const { hydrate } = useMembership()
const { paper, hydrate: hydratePaper } = usePaperTheme()
onMounted(() => {
  hydrate()
  hydratePaper()
})
useHead({
  htmlAttrs: computed(() => (paper.value === 'white' ? { 'data-paper': 'white' } : {}))
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
