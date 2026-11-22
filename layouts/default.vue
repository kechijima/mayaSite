<script setup lang="ts">
const route = useRoute()

// トップページ用: セクションへ移動するリンク群。
const HOME_LINKS = [
  { to: '/#diagnose', label: '診断する' },
  { to: '/#today', label: '今日のアーキタイプ' },
  { to: '/#compatibility', label: '相性診断' },
  { to: '/archetypes', label: 'アーキタイプ一覧' },
  { to: '/#news', label: 'ニュース' }
]
// 診断結果ページ用: 同ページ内セクションへのハッシュリンクのみ(id は pages/result.vue 側の
// 各<section>に対応 — #から始まるto はSiteHeader側で<NuxtLink>ではなく素の<a>として描画され、
// vue-routerを経由しない(query の name/birth/gender を保ったまま素直にハッシュジャンプする)。
// フッターを出さないページ。フォーム1枚・プラン選択だけの画面で、スクロールさせずに
// 1画面に収めて中央に置くため(.paper-page--focus と対)。
const FOOTERLESS_PATHS = ['/plans', '/signup', '/signup/referral', '/login', '/password-reset', '/account', '/checkout', '/checkout/pay', '/checkout/success', '/test']
// ピッタリ到達度テストの受験画面(/test/take)も同じ扱い(前方一致)。
const footerless = computed(() => FOOTERLESS_PATHS.includes(route.path) || route.path.startsWith('/test/'))

// ピッタリ到達度テストの固定フッター(components/TestFloatingCta.vue)を出すか。診断結果を見た後の公開ページ
// (/result、そこから進む /kin/… など)。トップ・フォーム系(フッターなしのページ)・テスト中は出さない。
// 2026-11-22: 相性診断(入力・結果)では出さない(要望)。アーキタイプ一覧はページの一番下に同じボタンを
// 置いたので出さない(二重になるため)。
const { last: lastDiagnosis } = useLastDiagnosis()
const showTestCta = computed(() =>
  !!lastDiagnosis.value && route.path !== '/' && !footerless.value && !route.path.startsWith('/legal/') &&
  route.path !== '/archetypes' && route.path !== '/compatibility' && !route.path.startsWith('/compatibility/')
)

const RESULT_LINKS = [
  { to: '#sun', label: '太陽の紋章' },
  { to: '#wavespell', label: 'ウェイブスペル' },
  { to: '#tone', label: '銀河の音' },
  { to: '#relations', label: 'KINの関係性' },
  { to: '#destiny', label: '運命数字' },
  { to: '#compatibility-cta', label: '相性診断' },
  { to: '/archetypes', label: 'アーキタイプ一覧' }
]
</script>

<template>
  <!-- ヘッダーはトップページ・診断結果ページ・ピッタリ到達度テストのみ。他のページ(登録・ログイン・
       プラン・決済など)は1画面で完結する導線なので出さない。コンポーネント自体を生成しないことで、
       他ページではスクロール監視などの処理も走らない。
       診断結果ページはファーストビュー(ヒーロー)が縦に長く、開いた直後からヘッダーが被さると
       邪魔になるため hide-until-scrolled でスクロールするまで非表示にする(トップページは
       従来通り最上部でも透過状態で常時表示)。 -->
  <SiteHeader v-if="route.path === '/'" :links="HOME_LINKS" />
  <SiteHeader v-else-if="route.path === '/result'" :links="RESULT_LINKS" hide-until-scrolled />
  <!-- ピッタリ到達度テスト(/test, /test/take)にも出す(2026-10-02: 受験中に他の画面へ移る手段が無かった)。
       項目はトップページと同じ(トップの各セクションへ)。名前からマイページへも行ける。
       ページ側は .paper-page--header で固定ヘッダーぶんの余白を取る。 -->
  <SiteHeader v-else-if="route.path === '/test' || route.path.startsWith('/test/')" :links="HOME_LINKS" />
  <!-- 相性診断(入力・結果)にも出す(2026-11-19 要望: メニューが出ていなかった)。 -->
  <SiteHeader v-else-if="route.path === '/compatibility' || route.path.startsWith('/compatibility/')" :links="HOME_LINKS" />
  <!-- アーキタイプ一覧(20の紋章の一覧、2026-11-19。2026-11-22 に /seals から改名) -->
  <SiteHeader v-else-if="route.path === '/archetypes'" :links="HOME_LINKS" />
  <slot />
  <SiteFooter v-if="!footerless" />
  <TestFloatingCta v-if="showTestCta" :hide-until-scrolled="route.path === '/result'" />
  <LoadingOverlay />
</template>
