<script setup lang="ts">
// 送信ボタンのそばに置く「〜することで、利用規約・プライバシーポリシーに同意したものとみなします」。
// 入力途中のフォームから離れると内容が消えるので、リンクは新しいタブで開く。
defineProps<{
  /** 「会員登録する」「お支払いへ進む」など、同意の対象になる操作の言い方 */
  action: string
  /** 特定商取引法に基づく表記へのリンクも出すか(決済画面用) */
  withTokushoho?: boolean
}>()
</script>

<template>
  <p class="legalconsent">
    {{ action }}ことで、<NuxtLink to="/legal/terms" target="_blank">利用規約</NuxtLink>・<NuxtLink to="/legal/privacy" target="_blank">プライバシーポリシー</NuxtLink><template v-if="withTokushoho">・<NuxtLink to="/legal/tokushoho" target="_blank">特定商取引法に基づく表記</NuxtLink></template>に同意したものとみなします。
  </p>
</template>
