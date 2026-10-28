<script setup lang="ts">
// 旧URL。結果表示の設定は 2026-10-28 に /admin/tests の「結果表示」タブへ移した(ブックマーク用に転送だけ残す)。
definePageMeta({ layout: 'admin' })
await navigateTo('/admin/tests?tab=result', { replace: true })
</script>

<template>
  <div />
</template>
