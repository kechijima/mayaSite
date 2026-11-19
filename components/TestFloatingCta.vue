<script setup lang="ts">
// ピッタリ到達度テストへの固定フッター(2026-11-19 要望: 診断結果以降、画面下に出し続ける)。
// 診断結果(/result)を見た後(useLastDiagnosis が入っている)だけ、layouts/default.vue が出す場所で表示する。
// 下に同じ高さの余白(spacer)を置き、サイトのフッターやページ末尾が隠れないようにする。
const { testLink } = useLastDiagnosis()
</script>

<template>
  <div class="testfloat-spacer" aria-hidden="true" />
  <div class="testfloat">
    <NuxtLink :to="testLink" class="testfloat__btn">
      ピッタリ到達度テストを受ける<small>25問・無料</small>
    </NuxtLink>
  </div>
</template>
