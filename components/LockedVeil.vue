<script setup lang="ts">
// 有料エリア。実際の本文は一切描画せず(ブラーを掛けていても本文はDOM上にそのまま残り、
// 開発者ツールで無料状態のまま読めてしまうため)、常に固定のダミー文でブラー+ピクセル
// グリッドの「モザイク」を掛けた背景として見せたうえで、中央に会員登録訴求(ボタン+
// 残り文字数)を重ねる(参考: kinoshita-reon.jp の result__sub__menu__mosaic)。
// remainingChars だけは呼び出し側から実データの文字数(本文そのものではなく数値のみ)を
// 受け取る — 数値だけなら本文の閲覧防止という設計意図を損なわない(utils/profileSections.ts
// の countChars 参照)。0/未指定のときは行ごと出さない。
// to は呼び出し側(pages/result.vue・pages/kin/[sealIndex].vue)から、遷移元に戻れるよう
// ?redirect=付きの/signupを渡す想定。決済導入前の現段階では「登録=解放」なので、
// 既定値もその/signupにしている。
withDefaults(defineProps<{ to?: string; remainingChars?: number }>(), {
  to: '/signup'
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
      <div class="gated__pitch">
        <p class="gated__kicker">ここから先は会員限定エリアです</p>
        <p class="gated__lead">この続きを見るには</p>
        <p class="gated__price">無料の<strong>会員登録</strong>で続きが読めます</p>
        <NuxtLink :to="to" class="gated__cta">
          <svg><use href="#i-lock" /></svg>会員登録して続きを見る
        </NuxtLink>
        <p v-if="remainingChars" class="gated__remaining">
          <svg><use href="#i-scroll" /></svg>残り{{ remainingChars.toLocaleString() }}文字
        </p>
      </div>
    </div>
  </div>
</template>
