<script setup lang="ts">
withDefaults(defineProps<{ label?: string }>(), { label: '有料会員限定コンテンツ' })
</script>

<template>
  <div class="relative">
    <div class="pointer-events-none select-none blur-[5px] opacity-55">
      <slot />
    </div>
    <div class="pointer-events-none absolute inset-x-0 -inset-y-2.5 bg-gradient-to-b from-transparent to-ink-950 to-[78%]"></div>
    <div
      class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-gold-500 bg-ink-950/85 px-4.5 py-2.5 text-[12.5px] font-semibold tracking-[.03em] text-gold-300"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-none">
        <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" stroke-width="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="2" />
      </svg>
      {{ label }}
    </div>
  </div>
</template>
