<script setup lang="ts">
import { sealColor } from '~/utils/mayaData'

const props = withDefaults(defineProps<{ sealIndex: number; size?: 'md' | 'lg' | 'xl' }>(), { size: 'md' })

// Subtle glow tint hints at the seal's traditional 4-color family (red/white/blue/yellow)
// without pulling focus from the black + gold frame.
const glow: Record<string, string> = {
  red: 'shadow-[0_0_18px_-2px_rgba(200,90,70,0.55)]',
  white: 'shadow-[0_0_18px_-2px_rgba(230,225,210,0.35)]',
  blue: 'shadow-[0_0_18px_-2px_rgba(90,140,190,0.5)]',
  yellow: 'shadow-[0_0_18px_-2px_rgba(248,200,113,0.55)]'
}

// Square, face-centered crops derived from the full-body portraits in assets/images/*.png —
// see assets/images/faces/ generation notes. Canonical `seal-{sealIndex}.webp` filenames, same
// convention as MayaPortrait, so no runtime name-matching is needed.
const modules = import.meta.glob('~/assets/images/faces/seal-*.webp', { eager: true, import: 'default' }) as Record<string, string>
const IMAGE_BY_INDEX: string[] = []
for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/seal-(\d+)\.webp$/)
  if (match) IMAGE_BY_INDEX[Number(match[1])] = url
}

const src = computed(() => IMAGE_BY_INDEX[props.sealIndex])
const colorKey = computed(() => sealColor(props.sealIndex))
const dims = computed(() => ({ md: 'w-[76px] h-[76px]', lg: 'w-24 h-24', xl: 'w-32 h-32' }[props.size]))
</script>

<template>
  <div
    class="relative flex flex-none items-center justify-center overflow-hidden rounded-full border-2 border-gold-500 bg-ink-900"
    :class="[dims, glow[colorKey]]"
  >
    <img :src="src" class="h-full w-full object-cover" />
    <div class="pointer-events-none absolute inset-[3px] rounded-full border border-gold-300/30"></div>
    <div class="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/[.06] to-transparent"></div>
  </div>
</template>
