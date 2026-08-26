<script setup lang="ts">
const { hydrate } = useMembership()
onMounted(() => {
  hydrate()
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
