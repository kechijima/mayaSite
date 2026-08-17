<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <!-- ヘッダーはトップページのみ。メニューの中身が全てトップページ内のセクションへの移動
       なので、他ページでは出す意味がない。コンポーネント自体を生成しないことで、
       他ページではスクロール監視などの処理も走らない。 -->
  <SiteHeader v-if="route.path === '/'" />
  <slot />
  <SiteFooter />
</template>
