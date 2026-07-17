<script setup lang="ts">
import { sealColor } from '~/utils/mayaData'

const props = withDefaults(defineProps<{ sealIndex: number; size?: 'md' | 'lg' }>(), { size: 'md' })

// Subtle glow tint hints at the seal's traditional 4-color family (red/white/blue/yellow)
// without pulling focus from the black + gold frame.
const glow: Record<string, string> = {
  red: 'shadow-[0_0_18px_-2px_rgba(200,90,70,0.55)]',
  white: 'shadow-[0_0_18px_-2px_rgba(230,225,210,0.35)]',
  blue: 'shadow-[0_0_18px_-2px_rgba(90,140,190,0.5)]',
  yellow: 'shadow-[0_0_18px_-2px_rgba(248,200,113,0.55)]'
}

const mark: Record<string, string> = {
  red: 'bg-[#c8785a]',
  white: 'bg-parchment-100',
  blue: 'bg-[#7fa8cc]',
  yellow: 'bg-gold-300'
}

const shapes = [
  'clip-path:polygon(50% 2%,61% 35%,98% 35%,68% 55%,79% 92%,50% 68%,21% 92%,32% 55%,2% 35%,39% 35%)',
  'clip-path:polygon(0 40%,70% 40%,55% 20%,100% 50%,55% 80%,70% 60%,0 60%)',
  'border-radius:9999px',
  'clip-path:polygon(0 45%,100% 45%,100% 55%,0 55%,0 45%,45% 0,55% 0,55% 100%,45% 100%)'
]

const colorKey = computed(() => sealColor(props.sealIndex))
const shapeStyle = computed(() => shapes[props.sealIndex % 4])
const dims = computed(() => (props.size === 'lg' ? 'w-24 h-24' : 'w-[76px] h-[76px]'))
const markDims = computed(() => (props.size === 'lg' ? 'w-9 h-9' : 'w-[26px] h-[26px]'))
</script>

<template>
  <div
    class="relative flex flex-none items-center justify-center rounded-full border-2 border-gold-500 bg-ink-900"
    :class="[dims, glow[colorKey]]"
  >
    <div class="absolute inset-[3px] rounded-full border border-gold-300/30"></div>
    <div class="absolute inset-0 rounded-full bg-gradient-to-br from-white/[.06] to-transparent"></div>
    <div class="relative opacity-90" :class="[markDims, mark[colorKey]]" :style="shapeStyle"></div>
  </div>
</template>
