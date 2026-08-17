import type { RouterConfig } from '@nuxt/schema'

// ハッシュ付きURL(/#today など)を開いたときのスクロール位置。
//
// 既定の挙動だと、このアプリでは着地位置が大きくズレる。ssr:false の完全静的SPAなので、
// ルーターがスクロール位置を決める時点ではまだ本文が1行も描画されておらず、対象要素が
// 存在しない(あるいは高さ0)ため。実測で /#today が本来70pxのところ773pxに着地していた。
//
// 対策として、対象要素が現れるまで待ち、さらにレイアウトが落ち着くまで少し待ってから
// 位置を返す。ページ内リンク(トップページのメニュー)は既に描画済みなので即座に解決する。
const APPEAR_TIMEOUT_MS = 2000
const SETTLE_MS = 120

function waitForElement(selector: string): Promise<Element | null> {
  return new Promise((resolve) => {
    const found = document.querySelector(selector)
    if (found) {
      resolve(found)
      return
    }
    const deadline = performance.now() + APPEAR_TIMEOUT_MS
    const tick = () => {
      const el = document.querySelector(selector)
      if (el) resolve(el)
      else if (performance.now() > deadline) resolve(null)
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

export default <RouterConfig>{
  async scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    if (!to.hash) return { top: 0 }
    if (!import.meta.client) return { top: 0 }

    const el = await waitForElement(to.hash)
    if (!el) return { top: 0 }
    // 直後は上にある画像の読み込みで位置がまだ動くので、少しだけ待つ。
    await new Promise((r) => setTimeout(r, SETTLE_MS))

    // vue-router に位置を返すのではなく scrollIntoView で自分でスクロールする。
    // ルーター側の実装は要素の座標をそのまま使い CSS の scroll-margin-top を見ないため、
    // 返す形だとセクションの先頭が固定ヘッダーの裏に潜ってしまう(実測 0px = 完全に隠れる)。
    // scrollIntoView なら scroll-margin-top(paper-theme.css)がそのまま効くので、
    // ヘッダー高さの定義を1か所に保てる。
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    return false
  }
}
