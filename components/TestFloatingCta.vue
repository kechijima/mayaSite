<script setup lang="ts">
// ピッタリ到達度テストへの固定フッター(2026-11-19 要望: 診断結果以降、画面下に出し続ける)。
// 診断結果(/result)を見た後(useLastDiagnosis が入っている)だけ、layouts/default.vue が出す場所で表示する。
// 下に同じ高さの余白(spacer)を置き、サイトのフッターやページ末尾が隠れないようにする。
// 2026-11-20: 診断結果ページではヘッダー(SiteHeader の hideUntilScrolled)と同じく、スクロールするまで隠す。
const props = defineProps<{ hideUntilScrolled?: boolean }>()
const { testLink } = useLastDiagnosis()

const scrolled = ref(false)
let ticking = false
function onScroll() {
  if (ticking) return
  ticking = true
  requestAnimationFrame(() => {
    scrolled.value = window.scrollY > 8
    ticking = false
  })
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
const hidden = computed(() => props.hideUntilScrolled && !scrolled.value)
</script>

<template>
  <div class="testfloat-spacer" aria-hidden="true" />
  <div class="testfloat" :class="{ 'is-hidden': hidden }">
    <NuxtLink :to="testLink" class="testfloat__btn">ピッタリ到達度テストを受ける</NuxtLink>
  </div>
</template>
