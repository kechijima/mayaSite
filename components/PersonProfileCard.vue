<script setup lang="ts">
import type { PersonProfile } from '~/composables/useCompatibility'
import { genderLabel } from '~/utils/gender'

const props = defineProps<{ profile: PersonProfile }>()

const displayBirthdate = computed(() => {
  const d = new Date(props.profile.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const displayGender = computed(() => genderLabel(props.profile.gender))
</script>

<template>
  <div class="rounded border border-gold-500/30 bg-white/[.02] p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="truncate font-display text-[17px]">{{ profile.name }}</h3>
      <span class="whitespace-nowrap text-[11px] tracking-[.08em] text-gold-300 tabular-nums">KIN {{ profile.kin }}</span>
    </div>
    <div class="mb-3 text-[12px] text-parchment-300">{{ displayBirthdate }} ｜ {{ displayGender }}</div>

    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <MayaGlyph :seal-index="profile.sealIndex" />
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em] text-parchment-300">太陽の紋章</div>
          <h4 class="font-display text-[15px]">{{ profile.sun.seal.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em] text-gold-300">{{ profile.sun.seal.english }} ｜ {{ profile.sun.seal.keyword }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t border-dashed border-gold-500/20 pt-3">
        <MayaGlyph :seal-index="profile.wavespellSealIndex" />
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em] text-parchment-300">ウェイブスペル</div>
          <h4 class="font-display text-[15px]">{{ profile.wavespell.seal.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em] text-gold-300">{{ profile.wavespell.seal.english }} ｜ {{ profile.wavespell.seal.keyword }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t border-dashed border-gold-500/20 pt-3">
        <div class="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-full border-2 border-gold-500 bg-ink-900">
          <span class="font-display text-[32px] leading-none text-gold-300">{{ profile.toneIndex + 1 }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em] text-parchment-300">銀河の音</div>
          <h4 class="font-display text-[15px]">{{ profile.tone.info.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em] text-gold-300">{{ profile.tone.info.english }} ｜ {{ profile.tone.info.keyword }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
