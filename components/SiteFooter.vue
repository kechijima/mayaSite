<script setup lang="ts">
// 全ユーザー向けページ共通のフッター(layouts/default.vue から差し込む)。/admin/** は
// layouts/admin.vue を使うので影響しない。
//
// 規約類(利用規約・プライバシーポリシー・特定商取引法に基づく表記)へのリンクを置く。
// 監修者紹介・占術紹介などはページがまだ無いので置いていない(作成時にここへ追加する)。
import { LEGAL_LINKS } from '~/utils/legalInfo'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="sitefooter">
    <div class="sitefooter__inner">
      <nav class="legallinks sitefooter__links" aria-label="規約・表記">
        <NuxtLink v-for="link in LEGAL_LINKS" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
      <p class="sitefooter__notice">
        本サイトに掲載されている文章・画像・イラスト等のコンテンツの著作権は、当サイトまたは正当な権利者に帰属します。<br />
        無断転載・無断複製・無断使用を固くお断りいたします。
      </p>
      <p class="sitefooter__copy">&copy; {{ year }} マヤ暦実行委員会 All Rights Reserved.</p>
    </div>
  </footer>
</template>
