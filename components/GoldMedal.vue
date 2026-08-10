<script setup lang="ts">
// Shared circular gold-ring medal badge (mockup's `.tone-medal` family), reused for: the hero's
// 銀河の音 number, PersonProfileCard's tone row, compatibility's KIN-number circles, and 運命数字's
// number cells. The hero's KIN number uses the separate pill-shaped KinBadge.vue instead — visually
// different (oval, with a "KIN" label), not a variant of this one.
withDefaults(
  defineProps<{ value: number | string; size?: number; diamonds?: boolean; numFontSize?: number }>(),
  { size: 88, diamonds: false }
)
</script>

<template>
  <div class="tone-medal" :style="{ width: `${size}px`, height: `${size}px` }">
    <span class="tone-medal__bg" />
    <span class="tone-medal__ring1" />
    <span class="tone-medal__ring2" />
    <template v-if="diamonds">
      <span class="tone-medal__diamond tone-medal__diamond--top" />
      <span class="tone-medal__diamond tone-medal__diamond--bottom" />
    </template>
    <span class="tone-medal__num" :style="{ fontSize: `${numFontSize ?? Math.round(size * 0.3)}px` }">{{ value }}</span>
  </div>
</template>
