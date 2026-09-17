<script setup lang="ts">
// 有料エリア。実際の本文は一切描画せず(ブラーを掛けていても本文はDOM上にそのまま残り、
// 開発者ツールで無料状態のまま読めてしまうため)、常に固定のダミー文でブラー+ピクセル
// グリッドの「モザイク」を掛けた背景として見せたうえで、中央に購入訴求(価格+ボタン+
// 文字数)を重ねる(参考: kinoshita-reon.jp の result__sub__menu__mosaic)。
//
// totalChars はページ内で隠れている有料エリアすべての文字数の合計(本文そのものではなく
// 数値のみ — 本文の閲覧防止という設計意図は損なわない)。1ページに複数の LockedVeil が
// あっても全て同じ合計値を表示する。0/未指定のときは行ごと出さない。
//
// to は購入プラン選択ページ(composables/usePlansLink.ts)。呼び出し側がKIN番号と
// 戻り先を付けて渡す。
withDefaults(defineProps<{ to?: string; totalChars?: number }>(), {
  to: '/plans'
})
</script>

<template>
  <div class="gated">
    <div class="gated__reveal" aria-hidden="true">
      <p>ここから先は有料エリアです。あなたの紋章や音の組み合わせから読み解く、より詳しい特徴や日常で活かせるヒントを、専門的な視点からまとめています。</p>
      <ul class="checklist">
        <li><svg><use href="#i-check" /></svg>あなたの強みを最大限に活かす方法</li>
        <li><svg><use href="#i-check" /></svg>人間関係で意識したいポイント</li>
        <li><svg><use href="#i-check" /></svg>日々の行動に取り入れたい習慣</li>
      </ul>
      <p>ご購入後はいつでも続きをご覧いただけます。今のあなたに必要なヒントを、ぜひ確認してみてください。</p>
    </div>
    <div class="gated__mosaic">
      <div class="gated__pitch">
        <p class="gated__kicker">ここから先は有料エリアです</p>
        <p class="gated__lead">この続きを見るには</p>
        <p class="gated__price">この記事は<strong>￥550</strong>で読めます</p>
        <p class="gated__subprice">有料会員なら、すべての診断結果が読み放題</p>
        <NuxtLink :to="to" class="gated__cta">
          <svg><use href="#i-lock" /></svg>続きを購入する
        </NuxtLink>
        <p v-if="totalChars" class="gated__remaining">
          <svg><use href="#i-scroll" /></svg>有料エリア 合計{{ totalChars.toLocaleString() }}文字
        </p>
      </div>
    </div>
  </div>
</template>
