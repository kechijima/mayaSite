<script setup lang="ts">
import type { TestAccess } from '~/composables/useTestAccess'

// 到達度テストを受けられない人への案内(/test と /test/[level] で共通)。
// 'ok' のときは何も描画しないので、呼び出し側は v-if を書かずに置ける。
defineProps<{
  access: TestAccess
  loginLink: string
  accountLink: string
}>()
</script>

<template>
  <section v-if="access === 'loading'" class="panel">
    <p class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>
  </section>

  <section v-else-if="access === 'signedOut'" class="panel">
    <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
      到達度テストはチーム会員の方向けの機能です。ログインしてからお進みください。
    </p>
    <NuxtLink :to="loginLink" class="btn-gold">ログインする</NuxtLink>
  </section>

  <section v-else-if="access === 'suspended'" class="panel">
    <p class="mb-2 text-[14.5px]">現在このアカウントはご利用いただけません。</p>
    <p class="text-[12.5px]" style="color: var(--ink-faint);">お手数ですがお問い合わせください。</p>
  </section>

  <section v-else-if="access === 'notTeam'" class="panel">
    <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
      到達度テストはチーム会員の方向けの機能です。ご紹介いただいたチームの紹介コードをマイページでご登録いただくと受けられるようになります。
    </p>
    <NuxtLink :to="accountLink" class="btn-outline">紹介コードを登録する</NuxtLink>
  </section>
</template>
