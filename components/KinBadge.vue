<script setup lang="ts">
defineProps<{ kin: number }>()
</script>

<template>
  <div class="relative mx-auto my-6 flex h-[130px] w-[240px] items-center justify-center">
    <div class="absolute inset-0 rounded-[999px] border border-gold-500/70"></div>
    <div class="absolute inset-[6px] rounded-[999px] border border-gold-300/30"></div>
    <span class="absolute -top-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border border-gold-500/70 bg-ink-950"></span>
    <span class="absolute -bottom-[7px] left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border border-gold-500/70 bg-ink-950"></span>
    <div class="relative flex flex-col items-center gap-0.5">
      <span class="text-[11px] tracking-[.35em] text-gold-300">KIN</span>
      <span class="font-decorative text-[46px] leading-none text-gold-300 [text-shadow:0_0_20px_rgba(248,200,113,0.35)]">{{ kin }}</span>
    </div>
  </div>
</template>
