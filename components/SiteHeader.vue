<script setup lang="ts">
import jmbLogoSrc from '~/assets/images/optimized/jmb-logo.webp'

// 全ユーザー向けページ共通のヘッダー(layouts/default.vue から差し込む)。/admin/** は
// layouts/admin.vue を使うので影響しない。
//
// ページ最上部では背景を敷かずアーチ装飾を隠さず、スクロールすると背景付きのバーになる。
// 診断結果ページはスマホで11,000px超あり、読み終えた人に次の導線が必要なため。
//
// メニューには未作成のページ(監修者紹介/占術紹介/利用規約)は載せない。
// links はページごとに layouts/default.vue から渡す(トップページ/診断結果ページ内の
// セクションへの移動)。to が "#" から始まる項目は<NuxtLink>ではなく素の<a>として描画する
// — vue-routerのpush/resolveを経由すると診断結果ページのquery(name/birth/gender)を
// 失いかねないため、同一ページ内のハッシュジャンプはブラウザのネイティブ挙動に任せる。
defineProps<{
  links: { to: string; label: string }[]
  // trueの場合、スクロールするまでヘッダー自体を非表示にする(診断結果ページ用)。
  // トップページは従来通り、最上部でも透過状態で常時表示する。
  hideUntilScrolled?: boolean
}>()

const route = useRoute()

const open = ref(false)
const scrolled = ref(false)

const burgerEl = ref<HTMLButtonElement | null>(null)
const drawerEl = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}
function toggle() {
  open.value = !open.value
}

// ルート遷移でメニューを閉じる。同じリンクを再度押した場合も閉じたいので、リンク側でも
// close() を呼んでいる(この watch はパスが変わらないと発火しないため)。
watch(() => route.fullPath, close)

// 背面スクロールの固定。documentElement 側にも掛けているのは、iOS Safari が body だけの
// overflow:hidden を無視してスクロールしてしまうため。
watch(open, (isOpen) => {
  if (!import.meta.client) return
  const value = isOpen ? 'hidden' : ''
  document.documentElement.style.overflow = value
  document.body.style.overflow = value
  if (isOpen) {
    nextTick(() => drawerEl.value?.querySelector<HTMLElement>('a, button')?.focus())
  } else {
    burgerEl.value?.focus()
  }
})

function onKeydown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'Escape') {
    close()
    return
  }
  if (e.key !== 'Tab') return
  // フォーカスをドロワー内(+開閉ボタン)に閉じ込める。背後のページはスクロールも操作も
  // できない状態なので、Tabだけ抜けていくと迷子になる。
  // 並び順はDOM順(開閉ボタン → ドロワー内リンク)に合わせること — 逆にすると「末尾」の判定が
  // 実際の最後の要素と食い違い、そこからTabで背後のページへ抜けてしまう。
  const focusable = [
    burgerEl.value,
    ...(drawerEl.value?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])
  ].filter((el): el is HTMLElement => !!el)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

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
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <header
    class="siteheader"
    :class="{ 'is-scrolled': scrolled, 'is-open': open, 'is-hidden': hideUntilScrolled && !scrolled }"
  >
    <div class="siteheader__inner">
      <NuxtLink to="/" class="siteheader__brand" @click="close">
        <img class="siteheader__logo" :src="jmbLogoSrc" width="448" height="448" alt="" decoding="async" />
        <span class="font-display siteheader__title">マヤ暦占い</span>
      </NuxtLink>

      <!-- PC用の横並びメニュー。スマホではCSSで隠し、下のドロワー側を使う。 -->
      <nav class="siteheader__nav" aria-label="メインメニュー">
        <template v-for="l in links" :key="l.to">
          <a v-if="l.to.startsWith('#')" :href="l.to" class="siteheader__link" @click="close">{{ l.label }}</a>
          <NuxtLink v-else :to="l.to" class="siteheader__link">{{ l.label }}</NuxtLink>
        </template>
      </nav>

      <button
        ref="burgerEl"
        type="button"
        class="siteheader__burger"
        :aria-expanded="open"
        aria-controls="site-menu"
        :aria-label="open ? 'メニューを閉じる' : 'メニューを開く'"
        @click="toggle"
      >
        <span class="siteheader__burger-bar" />
        <span class="siteheader__burger-bar" />
        <span class="siteheader__burger-bar" />
      </button>
    </div>

    <div class="siteheader__scrim" aria-hidden="true" @click="close" />

    <nav id="site-menu" ref="drawerEl" class="sitemenu" aria-label="メニュー" :inert="!open || undefined">
      <template v-for="l in links" :key="l.to">
        <a v-if="l.to.startsWith('#')" :href="l.to" class="sitemenu__link" @click="close">{{ l.label }}</a>
        <NuxtLink v-else :to="l.to" class="sitemenu__link" @click="close">{{ l.label }}</NuxtLink>
      </template>
    </nav>
  </header>
</template>
