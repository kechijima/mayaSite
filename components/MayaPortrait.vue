<script setup lang="ts">
import { sealColor } from '~/utils/mayaData'

const props = defineProps<{ sealIndex: number }>()

// Optimized (resized + WebP) character portraits, built from the full-resolution originals in
// assets/images/*.png via a one-off script — see the comment in assets/images/optimized/ output.
// Filenames are canonical `seal-{sealIndex}.webp` so no runtime name-matching is needed.
const modules = import.meta.glob('~/assets/images/optimized/seal-*.webp', { eager: true, import: 'default' }) as Record<string, string>
const IMAGE_BY_INDEX: string[] = []
for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/seal-(\d+)\.webp$/)
  if (match) IMAGE_BY_INDEX[Number(match[1])] = url
}

const src = computed(() => IMAGE_BY_INDEX[props.sealIndex])
const colorKey = computed(() => sealColor(props.sealIndex))

// Same color-family glow used by MayaGlyph, just stronger since this card is much larger.
const glow: Record<string, string> = {
  red: 'shadow-[0_0_32px_-6px_rgba(200,90,70,0.6)]',
  white: 'shadow-[0_0_32px_-6px_rgba(230,225,210,0.45)]',
  blue: 'shadow-[0_0_32px_-6px_rgba(90,140,190,0.55)]',
  yellow: 'shadow-[0_0_32px_-6px_rgba(248,200,113,0.6)]'
}
</script>

<template>
  <div
    class="relative flex-none overflow-hidden rounded-lg border-2 border-gold-500/70 bg-gradient-to-b from-parchment-100/[.08] to-parchment-100/[.03]"
    :class="glow[colorKey]"
    style="width: 176px; aspect-ratio: 0.56"
  >
    <img :src="src" class="h-full w-full object-cover object-top" />
    <div class="pointer-events-none absolute inset-0 rounded-[5px] shadow-[inset_0_0_18px_rgba(0,0,0,0.35)]"></div>
  </div>
</template>
