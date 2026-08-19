<script setup lang="ts">
// 有料エリア。実際の本文は一切描画せず(ブラーを掛けていても本文はDOM上にそのまま残り、
// 開発者ツールで無料状態のまま読めてしまうため)、常に固定のダミー文でブラー+ピクセル
// グリッドの「モザイク」を掛けた背景として見せたうえで、中央に大きな「続きを見る」
// ボタンを重ねる(参考: kinoshita-reon.jp の result__sub__menu__mosaic)。
// 呼び出し側からは何も渡させない(実データを一切受け取らない)ことで、DOM経由での閲覧を
// 構造的に防いでいる。
withDefaults(defineProps<{ label?: string; to?: string }>(), {
  label: '続きを見る',
  to: '/checkout'
})
</script>

<template>
  <div class="gated">
    <div class="gated__reveal" aria-hidden="true">
      <p>ここから先はプレミアム会員限定の内容です。あなたの紋章や音の組み合わせから読み解く、より詳しい特徴や日常で活かせるヒントを、専門的な視点からまとめています。</p>
      <ul class="checklist">
        <li><svg><use href="#i-check" /></svg>あなたの強みを最大限に活かす方法</li>
        <li><svg><use href="#i-check" /></svg>人間関係で意識したいポイント</li>
        <li><svg><use href="#i-check" /></svg>日々の行動に取り入れたい習慣</li>
      </ul>
      <p>登録後はいつでもマイページから続きをご覧いただけます。今のあなたに必要なヒントを、ぜひ確認してみてください。</p>
    </div>
    <div class="gated__mosaic">
      <NuxtLink :to="to" class="gated__cta">
        <svg><use href="#i-lock" /></svg>{{ label }}
      </NuxtLink>
    </div>
  </div>
</template>
