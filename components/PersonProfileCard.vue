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
    <h3 class="truncate font-display text-[17px]">{{ profile.name }}</h3>
    <div class="mb-3 text-[12px]" style="color: var(--ink-faint);">{{ displayBirthdate }} ｜ {{ displayGender }}</div>

    <!-- 太陽の紋章/ウェイブスペル/銀河の音を横並びに(以前は1列に積んでいた)。
         列内の英語名・キーワードは3カラムだと窮屈になるため省略し、名前のみ表示する
         (このページの「相性」セクションの簡易カードと同じ簡潔さに揃えている)。 -->
    <div class="grid grid-cols-3 gap-1 text-center">
      <div>
        <MayaGlyph :seal-index="profile.sealIndex" class="mx-auto block" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">太陽の紋章</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.sun.seal.name }}</h4>
      </div>
      <div class="border-x border-dashed px-1" style="border-color: var(--gold-line-soft);">
        <MayaGlyph :seal-index="profile.wavespellSealIndex" class="mx-auto block" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">ウェイブスペル</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.wavespell.seal.name }}</h4>
      </div>
      <div>
        <GoldMedal :value="profile.toneIndex + 1" :size="58" :num-font-size="22" class="mx-auto" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">銀河の音</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.tone.info.name }}</h4>
      </div>
    </div>

    <!-- 運命数字(KIN番号)。ヘッダーの簡易表記(KIN xx)は、この本表示と重複するため廃止した。 -->
    <div class="mt-3 flex flex-col items-center border-t border-dashed pt-3" style="border-color: var(--gold-line-soft);">
      <GoldMedal :value="profile.kin" :size="68" :num-font-size="26" />
      <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">運命数字</div>
    </div>
  </div>
</template>
