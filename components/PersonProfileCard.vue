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
  <div
    class="rounded-xl p-4"
    style="border: 1px solid var(--gold-line-soft); background: radial-gradient(140% 170% at 20% 0%, var(--paper-panel) 0%, var(--paper-panel-2) 100%); box-shadow: var(--shadow);"
  >
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="truncate font-display text-[17px]">{{ profile.name }}</h3>
      <span class="whitespace-nowrap text-[11px] tracking-[.08em] tabular-nums" style="color: var(--gold-deep); font-family: 'Shippori Mincho', serif;">KIN {{ profile.kin }}</span>
    </div>
    <div class="mb-3 text-[12px]" style="color: var(--ink-faint);">{{ displayBirthdate }} ｜ {{ displayGender }}</div>

    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <MayaGlyph :seal-index="profile.sealIndex" />
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em]" style="color: var(--ink-faint);">太陽の紋章</div>
          <h4 class="font-display text-[15px]">{{ profile.sun.seal.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em]" style="color: var(--gold-deep);">{{ profile.sun.seal.english }} ｜ {{ profile.sun.seal.keyword }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t border-dashed pt-3" style="border-color: var(--gold-line-soft);">
        <MayaGlyph :seal-index="profile.wavespellSealIndex" />
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em]" style="color: var(--ink-faint);">ウェイブスペル</div>
          <h4 class="font-display text-[15px]">{{ profile.wavespell.seal.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em]" style="color: var(--gold-deep);">{{ profile.wavespell.seal.english }} ｜ {{ profile.wavespell.seal.keyword }}</span>
        </div>
      </div>
      <div class="flex items-center gap-3 border-t border-dashed pt-3" style="border-color: var(--gold-line-soft);">
        <GoldMedal :value="profile.toneIndex + 1" :size="58" :num-font-size="22" />
        <div class="min-w-0 flex-1">
          <div class="mb-0.5 text-[10px] tracking-[.1em]" style="color: var(--ink-faint);">銀河の音</div>
          <h4 class="font-display text-[15px]">{{ profile.tone.info.name }}</h4>
          <span class="text-[11.5px] tracking-[.03em]" style="color: var(--gold-deep);">{{ profile.tone.info.english }} ｜ {{ profile.tone.info.keyword }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
