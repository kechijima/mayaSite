<script setup lang="ts">
import dividerSrc from '~/assets/images/optimized/divider.webp'

defineProps<{ label: string; eyebrow?: string }>()
</script>

<template>
  <div class="archframe" aria-hidden="true"><img :src="dividerSrc" alt="" /></div>
  <div v-if="eyebrow" class="section__eyebrow">{{ eyebrow }}</div>
  <h2 class="font-display section__title">{{ label }}</h2>
</template>
