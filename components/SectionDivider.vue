<script setup lang="ts">
import dividerSrc from '~/assets/images/optimized/divider.webp'

// `numeric` — for titles embedding a KIN number (e.g. "KIN121のあなたへ"), renders the whole
// heading in the same plain "Shippori Mincho" used by the KIN/tone medal numbers instead of the
// font-display stack (Cormorant Garamond first), so the digits match the medals' digit shapes.
// Default false leaves every other (purely Japanese) section title unchanged.
withDefaults(defineProps<{ label: string; eyebrow?: string; numeric?: boolean }>(), { numeric: false })
</script>

<template>
  <div class="archframe" aria-hidden="true"><img :src="dividerSrc" alt="" /></div>
  <div v-if="eyebrow" class="section__eyebrow">{{ eyebrow }}</div>
  <h2 class="section__title" :class="numeric ? '' : 'font-display'" :style="numeric ? { fontFamily: '\'Shippori Mincho\', serif' } : {}">{{ label }}</h2>
</template>
