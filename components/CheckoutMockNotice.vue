<script setup lang="ts">
// 決済フローの各画面に出す「まだ本物ではない」の断り書き。決済(Stripe)を導入したら
// この部品ごと消す(utils/checkout.ts のコメント参照)。
</script>

<template>
  <p class="notice notice--info">
    決済機能は準備中です。この画面は遷移を確認するための仮表示で、実際のお支払いは発生しません。
  </p>
</template>
