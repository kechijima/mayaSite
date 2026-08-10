<script setup lang="ts">
const props = withDefaults(defineProps<{ sealIndex: number; size?: 'md' | 'lg' | 'xl' }>(), { size: 'md' })

// Face-centered crops derived from the full-body portraits — assets/images/faces/seal-*.webp,
// same canonical filename convention as MayaPortrait, all 20 present.
const modules = import.meta.glob('~/assets/images/faces/seal-*.webp', { eager: true, import: 'default' }) as Record<string, string>
const IMAGE_BY_INDEX: string[] = []
for (const [path, url] of Object.entries(modules)) {
  const match = path.match(/seal-(\d+)\.webp$/)
  if (match) IMAGE_BY_INDEX[Number(match[1])] = url
}

const src = computed(() => IMAGE_BY_INDEX[props.sealIndex])
const dims: Record<string, number> = { md: 58, lg: 76, xl: 104 }
const size = computed(() => dims[props.size])
</script>

<template>
  <span class="medal__ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <img :src="src" alt="" />
  </span>
</template>
