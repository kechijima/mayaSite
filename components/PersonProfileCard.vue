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
    class="rounded-xl p-5 sm:p-6"
    style="border: 1px solid var(--gold-line-soft); background: radial-gradient(140% 170% at 20% 0%, var(--paper-panel) 0%, var(--paper-panel-2) 100%); box-shadow: var(--shadow);"
  >
    <!-- 2026-11-19 要望: カードを大きく、KIN番号をカード上に出す。 -->
    <div class="flex items-baseline justify-between gap-3">
      <h3 class="min-w-0 truncate font-display text-[20px]">{{ profile.name }}</h3>
      <span class="shrink-0 font-display text-[18px] font-semibold" style="color: var(--gold-deep);">KIN {{ profile.kin }}</span>
    </div>
    <div class="mb-4 text-[12.5px]" style="color: var(--ink-faint);">{{ displayBirthdate }} ｜ {{ displayGender }}</div>

    <!-- 太陽の紋章/ウェイブスペル/銀河の音を横並びに(以前は1列に積んでいた)。
         列内の英語名・キーワードは3カラムだと窮屈になるため省略し、名前のみ表示する
         (このページの「相性」セクションの簡易カードと同じ簡潔さに揃えている)。
         各列のアイコンは"mx-auto block"ではなく明示的なstyleでdisplay:blockを当てている —
         paper-theme.cssに無関係な用途の`.block`クラス(プローズブロック用の余白付きクラス)が
         既に存在し、Tailwindの`block`ユーティリティと名前衝突してmargin-topが乗ってしまうため。 -->
    <div class="grid grid-cols-3 gap-1 text-center">
      <div>
        <MayaGlyph :seal-index="profile.sealIndex" :gender="profile.gender" size="lg" class="mx-auto" style="display: block;" />
        <div class="mt-1.5 text-[11px] tracking-[.08em]" style="color: var(--ink-faint);">太陽の紋章</div>
        <h4 class="font-display text-[15px] leading-tight">{{ profile.sun.seal.name }}</h4>
      </div>
      <div class="px-1">
        <MayaGlyph :seal-index="profile.wavespellSealIndex" :gender="profile.gender" size="lg" class="mx-auto" style="display: block;" />
        <div class="mt-1.5 text-[11px] tracking-[.08em]" style="color: var(--ink-faint);">ウェイブスペル</div>
        <h4 class="font-display text-[15px] leading-tight">{{ profile.wavespell.seal.name }}</h4>
      </div>
      <div>
        <GoldMedal :value="profile.toneIndex + 1" :size="76" :num-font-size="28" class="mx-auto" />
        <div class="mt-1.5 text-[11px] tracking-[.08em]" style="color: var(--ink-faint);">銀河の音</div>
        <h4 class="font-display text-[15px] leading-tight">{{ profile.tone.info.name }}</h4>
      </div>
    </div>

    <!-- 運命数字: 見出し無しのリスト。KINの関係性(ガイド/反対/神秘/類似KIN)はアーキタイプ名で、
         鏡の向こうの自分/絶対反対KINは番号で示す — 前者と後者は別グループなので<ul>を分けて
         間を空けている(space-y-*はul単位でしかmargin-topを制御できないため)。 -->
    <div class="mt-3 pt-3">
      <ul class="mx-auto w-full max-w-[260px] space-y-1.5 text-[13.5px]" style="color: var(--ink-soft);">
        <li class="flex items-center justify-between">
          <span>ガイドKIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.relations.guide.name }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>反対KIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.relations.antipode.name }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>神秘KIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.relations.mystic.name }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>類似KIN</span>
          <span class="font-semibold" style="color: var(--ink);">{{ profile.relations.analog.name }}</span>
        </li>
      </ul>
      <ul class="mx-auto mt-3 w-full max-w-[260px] space-y-1.5 text-[13.5px]" style="color: var(--ink-soft);">
        <li class="flex items-center justify-between">
          <span>鏡の向こうの自分KIN</span>
          <span class="font-semibold" style="color: var(--ink);">KIN {{ profile.mirrorKin }}</span>
        </li>
        <li class="flex items-center justify-between">
          <span>絶対反対KIN</span>
          <span class="font-semibold" style="color: var(--ink);">KIN {{ profile.absoluteOppositeKin }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
