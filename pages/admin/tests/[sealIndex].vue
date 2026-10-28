<script setup lang="ts">
// 旧URL。紋章ごとの編集は 2026-10-28 に /admin/tests の中(一覧からその場で詳細へ切り替え)へ移した。
// ブックマーク・過去のリンク用に、同じ紋章・同じタブへ転送だけ残す。
definePageMeta({ layout: 'admin' })
const route = useRoute()
const seal = String(route.params.sealIndex)
await navigateTo(route.query.tab === 'result' ? `/admin/tests?tab=result&sub=seal&seal=${seal}` : `/admin/tests?seal=${seal}`, { replace: true })
</script>

<template>
  <div />
</template>
