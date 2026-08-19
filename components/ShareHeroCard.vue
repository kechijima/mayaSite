<script setup lang="ts">
import type { Gender } from '~/utils/gender'

// SNSシェア用の画像化専用カード。pages/result.vue の .hero と見た目は揃えているが、
// .hero自身は100vw breakout + svh + 装飾疑似要素で「画面いっぱいに表示される」前提の
// レイアウトなので、そのままhtml-to-imageでキャプチャすると崩れる。そのためこのコンポーネントは
// 固定px(1080×1350、4:5)で完全に独立してレイアウトし、pages/result.vueから画面外
// (.sharecard-mount、left:-9999px)に常時マウントしておいて、シェア時だけこのDOMノードを
// キャプチャする。
defineProps<{
  birthdate: string
  kin: number
  toneIndex: number
  sealIndex: number
  wavespellSealIndex: number
  gender: Gender
  sunName: string
  wavespellName: string
}>()
</script>

<template>
  <div class="sharecard">
    <div class="sharecard__bg" aria-hidden="true">
      <div class="sharecard__bg-top" />
      <div class="sharecard__bg-bottom" />
    </div>
    <div class="sharecard__frame">
      <p class="sharecard__title">あなたの本質と運勢</p>
      <p class="sharecard__sub">マヤのツォルキン暦から未来のあるべき自分を知ろう</p>

      <div class="sharecard__stats">
        <div class="sharecard__cell">
          <span class="sharecard__label">生年月日</span>
          <span class="sharecard__date">{{ birthdate }}</span>
        </div>
        <div class="sharecard__cell">
          <span class="sharecard__label">KIN</span>
          <span class="sharecard__num">{{ kin }}</span>
        </div>
        <div class="sharecard__cell">
          <span class="sharecard__label">銀河の音</span>
          <span class="sharecard__num">{{ toneIndex + 1 }}</span>
        </div>
      </div>

      <div class="sharecard__duo">
        <div class="sharecard__art sharecard__art--l"><MayaPortraitFrame :seal-index="sealIndex" :gender="gender" /></div>
        <div class="sharecard__art sharecard__art--r"><MayaPortraitFrame :seal-index="wavespellSealIndex" :gender="gender" /></div>
        <div class="sharecard__cap sharecard__cap--l">
          <span class="sharecard__role">太陽の紋章</span>
          <span class="sharecard__seal">{{ sunName }}</span>
        </div>
        <span class="sharecard__x">×</span>
        <div class="sharecard__cap sharecard__cap--r">
          <span class="sharecard__role">ウェイブスペル</span>
          <span class="sharecard__seal">{{ wavespellName }}</span>
        </div>
      </div>

      <p class="sharecard__brand">マヤ暦占い</p>
    </div>
  </div>
</template>

<style scoped>
.sharecard {
  position: relative;
  width: 1080px;
  height: 1350px;
  background: var(--paper);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic Medium", "Yu Gothic", "Noto Sans JP", sans-serif;
  color: var(--ink);
  overflow: hidden;
}
/* 実機のファーストビュー(.hero .heroframe)と同じ、1枚の縦長画像(1:2)を上下2枚の
   正方形に分けて貼る手法。background-size:100% 200%で「画像全体が正方形の2倍の高さ」に
   なるので、上半分/下半分がそれぞれの正方形にちょうど収まる(画像中央は透明なので
   歪みも余白も出ない、詳細はassets/css/paper-theme.cssの.heroframeのコメント参照)。
   .heroframeは::before/::afterの疑似要素だが、html-to-imageは疑似要素の背景画像を
   確実には拾えない(実機DOM上は正しく表示されるが、キャプチャしたPNGには出ないことを
   確認済み)ため、ここは実DOM要素(div)にしている。 */
.sharecard__bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.sharecard__bg-top,
.sharecard__bg-bottom {
  position: absolute; left: 0; right: 0; aspect-ratio: 1 / 1;
  background-image: url("../assets/images/optimized/hero-frame.webp");
  background-repeat: no-repeat; background-size: 100% 200%;
}
.sharecard__bg-top { top: 0; background-position: top center; }
.sharecard__bg-bottom { bottom: 0; background-position: bottom center; }

.sharecard__frame {
  position: relative;
  z-index: 1;
  width: calc(100% - 96px);
  height: calc(100% - 96px);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72px 48px 56px;
}
.sharecard__title {
  font-family: '"Cormorant Garamond"', '"Shippori Mincho B1"', serif;
  font-size: 56px;
  letter-spacing: .14em;
  margin: 0 0 14px;
  text-align: center;
}
.sharecard__sub { font-size: 24px; color: var(--ink-soft); letter-spacing: .02em; margin: 0 0 48px; text-align: center; }

.sharecard__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; max-width: 760px; margin: 0 0 56px; }
.sharecard__cell {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 32px 12px 26px; border-radius: 16px; border: 1px solid var(--gold-line-soft);
  background: radial-gradient(140% 170% at 30% 0%, var(--paper-panel) 0%, var(--paper-panel-2) 100%);
}
.sharecard__label { font-size: 20px; color: var(--ink-faint); letter-spacing: .02em; }
.sharecard__date { font-size: 26px; font-variant-numeric: tabular-nums; }
.sharecard__num { font-family: '"Shippori Mincho B1"', serif; font-variant-numeric: tabular-nums; font-size: 48px; line-height: 1; color: var(--gold-deep); }

/* 固定サイズカードなので、.hero/.kinduoのようにflex/gridの%高さ解決に頼らず、キャラクター
   ボックスの高さを直接pxで固定している(%height/flex-growの多段ネストは、実測で
   ブラウザによって中間層の高さが定まらずheight:100%がautoに落ちることがあり脆いため)。
   左右の紋章名との対応も、元のkinduo__art--l/--rと同じくgrid-column明示で固定する
   (未指定だと自動配置で右側が「×」の中央列に置かれてしまう)。 */
.sharecard__duo {
  width: 100%; max-width: 760px; margin: 0 0 40px;
  display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  column-gap: 12px; row-gap: 20px;
}
.sharecard__art { grid-row: 1; width: 100%; height: 520px; min-width: 0; overflow: visible; }
.sharecard__art--l { grid-column: 1; }
.sharecard__art--r { grid-column: 3; }
.sharecard__art img { display: block; width: 100%; height: 100%; object-fit: contain; object-position: top center; }
.sharecard__cap { grid-row: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; min-width: 0; }
.sharecard__cap--l { grid-column: 1; }
.sharecard__cap--r { grid-column: 3; }
.sharecard__role { font-size: 20px; letter-spacing: .12em; color: var(--ink-faint); }
.sharecard__seal { font-family: '"Cormorant Garamond"', '"Shippori Mincho B1"', serif; font-size: 44px; letter-spacing: .05em; color: var(--gold-deep); }
.sharecard__x { grid-column: 2; grid-row: 2; align-self: start; margin-top: 6px; font-size: 36px; color: var(--gold); }

.sharecard__brand { margin: 24px 0 0; font-size: 20px; letter-spacing: .28em; color: var(--gold-deep); }
</style>
