<script setup lang="ts">
const route = useRoute()

// トップページ用: セクションへ移動するリンク群。
const HOME_LINKS = [
  { to: '/#diagnose', label: '診断する' },
  { to: '/#today', label: '今日のアーキタイプ' },
  { to: '/#compatibility', label: '相性診断' },
  { to: '/#news', label: 'ニュース' }
]
// 診断結果ページ用: 同ページ内セクションへのハッシュリンクのみ(id は pages/result.vue 側の
// 各<section>に対応 — #から始まるto はSiteHeader側で<NuxtLink>ではなく素の<a>として描画され、
// vue-routerを経由しない(query の name/birth/gender を保ったまま素直にハッシュジャンプする)。
const RESULT_LINKS = [
  { to: '#sun', label: '太陽の紋章' },
  { to: '#wavespell', label: 'ウェイブスペル' },
  { to: '#tone', label: '銀河の音' },
  { to: '#relations', label: 'KINの関係性' },
  { to: '#destiny', label: '運命数字' },
  { to: '#compatibility-cta', label: '相性診断' }
]
</script>

<template>
  <!-- ヘッダーはトップページと診断結果ページのみ。メニューの中身がいずれもページ内セクション
       への移動なので、他ページでは出す意味がない。コンポーネント自体を生成しないことで、
       他ページではスクロール監視などの処理も走らない。
       診断結果ページはファーストビュー(ヒーロー)が縦に長く、開いた直後からヘッダーが被さると
       邪魔になるため hide-until-scrolled でスクロールするまで非表示にする(トップページは
       従来通り最上部でも透過状態で常時表示)。 -->
  <SiteHeader v-if="route.path === '/'" :links="HOME_LINKS" />
  <SiteHeader v-else-if="route.path === '/result'" :links="RESULT_LINKS" hide-until-scrolled />
  <slot />
  <SiteFooter />
</template>
