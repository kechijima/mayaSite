<script setup lang="ts">
import type { TestAccess, TestSeal } from '~/composables/useTestAccess'

// ピッタリ到達度テストを始められないときの案内(/test と /test/take で共通)。
// 2026-11-19 に全員へ開放してからは、出すのは「利用停止中」と「紋章が決まらない」の2つだけ。
//   - 利用停止中
//   - 未ログインで診断結果から来ていない(?kin が無い) → まず無料診断へ
//   - 会員だが生年月日が無い → マイページへ
// それ以外(受けられる)ときは何も描画しないので、呼び出し側は v-if を書かずに置ける。
defineProps<{
  access: TestAccess
  seal: TestSeal | null
  loginLink: string
}>()
</script>

<template>
  <template v-if="access === 'loading'" />

  <section v-else-if="access === 'suspended'" class="panel text-center">
    <p class="mb-2 text-[14.5px]">現在このアカウントはご利用いただけません。</p>
    <p class="text-[12.5px]" style="color: var(--ink-faint);">お手数ですがお問い合わせください。</p>
  </section>

  <section v-else-if="!seal && access === 'guest'" class="panel text-center">
    <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
      ピッタリ到達度テストは、あなたの太陽の紋章について答えるテストです。まずは無料診断で、あなたの紋章を確かめてください。
    </p>
    <div class="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
      <NuxtLink to="/#diagnose" class="btn-gold">無料で診断する</NuxtLink>
      <NuxtLink :to="loginLink" class="btn-outline">ログインする</NuxtLink>
    </div>
  </section>

  <section v-else-if="!seal" class="panel text-center">
    <p class="mb-4 text-[13.5px]" style="color: var(--ink-soft);">生年月日が登録されていないため紋章を求められません。</p>
    <NuxtLink to="/account" class="btn-outline">マイページで登録する</NuxtLink>
  </section>
</template>
