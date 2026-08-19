// スマホの「見えている高さ」をJavaScriptで実測し、CSSカスタムプロパティ --vh として提供する。
//
// CSSの100vh/100svh/100dvhは、Chrome DevToolsのデバイスツールバー(端末エミュレーション)で
// 実機と異なる値に計算されることがある(dvh/svhの計算がエミュレート中のウィンドウ状態を
// 正しく反映しないケースがあり、Chromeのバージョンによって挙動が変わる既知の問題)。
// これに対し window.innerHeight はDevToolsのエミュレーションでも常に正しい値を返すため、
// そちらを基準にする方が確実。
//
// pages/result.vue の .hero はCSS側で vh → svh → dvh → var(--vh) の順に上書きしており、
// このJSが実行された後は必ず var(--vh) が最終的に効く(cascadeの後勝ちルールにより)。
// JS実行前(初回ペイント)はsvh/dvhによる素のCSSフォールバックで概ね正しい高さになる。
//
// 初回表示時に1度だけ計測し、以降は固定する(resize/visualViewportの監視はあえて行わない)。
// スクロール中にアドレスバーが出入りするとブラウザのビューポート高さ自体が変わり、
// resizeを監視していると .hero がそのたびに伸び縮みしてしまう — 額縁として作っている
// ファーストビューが表示中に動くのは望ましくないため、最初に確定した高さのまま固定する。
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  // CSS側は calc(var(--vh) * 100) で「100vh相当」を組み立てるので、--vh には
  // 高さそのものではなく「1%ぶん」を入れる。ここで高さそのものを入れてしまうと
  // calc()で100倍され、意図した高さの100倍のとんでもない値になる。
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`)
})
