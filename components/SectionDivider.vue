<script setup lang="ts">
defineProps<{ label: string; eyebrow?: string }>()
</script>

<template>
  <div class="mb-6 text-center">
    <span v-if="eyebrow" class="font-body font-eyebrow-italic mb-1 block text-[22px] text-gold-300">{{ eyebrow }}</span>
    <div class="flex items-center gap-3.5 text-gold-500">
      <span class="h-px flex-1 bg-gold-500/30"></span>
      <span class="whitespace-nowrap font-display text-[19px] tracking-[.08em] text-parchment-100">{{ label }}</span>
      <span class="h-px flex-1 bg-gold-500/30"></span>
    </div>
  </div>
</template>
