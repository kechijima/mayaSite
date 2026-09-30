<script setup lang="ts">
import type { TestAccess } from '~/composables/useTestAccess'

// 到達度テストを受けられない人への案内(/test と /test/take で共通)。
// 'ok' と 'loading' のときは何も描画しないので、呼び出し側は v-if を書かずに置ける。
defineProps<{
  access: TestAccess
  loginLink: string
  accountLink: string
}>()
</script>

<template>
  <!-- loading の間は useTestAccess 側が画面を覆っているので、ここでは何も出さない -->
  <template v-if="access === 'loading'" />

  <section v-else-if="access === 'signedOut'" class="panel text-center">
    <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
      到達度診断テストはチーム会員・有料会員の方向けの機能です。ログインしてからお進みください。
    </p>
    <NuxtLink :to="loginLink" class="btn-gold">ログインする</NuxtLink>
  </section>

  <section v-else-if="access === 'suspended'" class="panel text-center">
    <p class="mb-2 text-[14.5px]">現在このアカウントはご利用いただけません。</p>
    <p class="text-[12.5px]" style="color: var(--ink-faint);">お手数ですがお問い合わせください。</p>
  </section>

  <section v-else-if="access === 'notTeam'" class="panel text-center">
    <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
      到達度診断テストはチーム会員・有料会員の方向けの機能です。ご紹介いただいたチームの紹介コードをマイページでご登録いただくか、有料会員になると受けられるようになります。
    </p>
    <div class="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
      <NuxtLink :to="accountLink" class="btn-outline">紹介コードを登録する</NuxtLink>
      <NuxtLink to="/plans" class="btn-gold">プランを見る</NuxtLink>
    </div>
  </section>
</template>
