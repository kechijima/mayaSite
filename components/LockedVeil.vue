<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: '有料会員限定コンテンツ' })
</script>

<template>
  <div class="gated">
    <div class="gated__reveal" hidden>
      <slot />
    </div>
    <div class="gated__mosaic">
      <span class="gated__lock">
        <svg><use href="#i-lock" /></svg>
        {{ label }}
      </span>
    </div>
  </div>
</template>
