<script setup lang="ts">
// 全ユーザー向けページ共通のフッター(layouts/default.vue から差し込む)。/admin/** は
// layouts/admin.vue を使うので影響しない。
//
// 監修者紹介・占術紹介・利用規約などのリンクは、それらのページがまだ無いので置いていない
// (作成時にここへ追加する)。有料課金を始める際は「特定商取引法に基づく表記」も必要になる。
const year = new Date().getFullYear()
</script>

<template>
  <footer class="sitefooter">
    <div class="sitefooter__inner">
      <p class="sitefooter__notice">
        本サイトに掲載されている文章・画像・イラスト等のコンテンツの著作権は、当サイトまたは正当な権利者に帰属します。<br />
        無断転載・無断複製・無断使用を固くお断りいたします。
      </p>
      <p class="sitefooter__copy">&copy; {{ year }} マヤ暦占い All Rights Reserved.</p>
    </div>
  </footer>
</template>
