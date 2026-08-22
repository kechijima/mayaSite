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
         (このページの「相性」セクションの簡易カードと同じ簡潔さに揃えている)。
         各列のアイコンは"mx-auto block"ではなく明示的なstyleでdisplay:blockを当てている —
         paper-theme.cssに無関係な用途の`.block`クラス(プローズブロック用の余白付きクラス)が
         既に存在し、Tailwindの`block`ユーティリティと名前衝突してmargin-topが乗ってしまうため。 -->
    <div class="grid grid-cols-3 gap-1 text-center">
      <div>
        <MayaGlyph :seal-index="profile.sealIndex" class="mx-auto" style="display: block;" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">太陽の紋章</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.sun.seal.name }}</h4>
      </div>
      <div class="px-1">
        <MayaGlyph :seal-index="profile.wavespellSealIndex" class="mx-auto" style="display: block;" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">ウェイブスペル</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.wavespell.seal.name }}</h4>
      </div>
      <div>
        <GoldMedal :value="profile.toneIndex + 1" :size="58" :num-font-size="22" class="mx-auto" />
        <div class="mt-1.5 text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">銀河の音</div>
        <h4 class="font-display text-[13px] leading-tight">{{ profile.tone.info.name }}</h4>
      </div>
    </div>

    <!-- 運命数字: メダル表示ではなくリストで、同じ/前/次/鏡の向こうの自分/絶対反対の5つのKINを全て記載する。 -->
    <div class="mt-3 pt-3">
      <div class="text-center text-[10px] tracking-[.08em]" style="color: var(--ink-faint);">運命数字</div>
      <ul class="mx-auto mt-1.5 w-full max-w-[220px] space-y-1 text-[12.5px]" style="color: var(--ink-soft);">
        <li class="flex items-center justify-between">
          <span>同じKIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.kin }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>前のKIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.prevKin }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>次のKIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.nextKin }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>鏡の向こうの自分KIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.mirrorKin }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>絶対反対KIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.absoluteOppositeKin }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
