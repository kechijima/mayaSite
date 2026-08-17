<script setup lang="ts">
// 有料エリア。中身を消さずに、強いブラー+ピクセルグリッドの「モザイク」を掛けた背景として
// 見せたうえで、中央に大きな「続きを見る」ボタンを重ねる(参考: kinoshita-reon.jp の
// result__sub__menu__mosaic — モザイク画像の上に幅57%のボタンを絶対配置している)。
// 本文はaria-hidden + pointer-events/user-select無効で、読ませないための飾りとして扱う。
withDefaults(defineProps<{ label?: string; to?: string }>(), {
  label: '続きを見る',
  to: '/checkout'
})
</script>

<template>
  <div class="gated">
    <div class="gated__reveal" aria-hidden="true">
      <slot />
    </div>
    <div class="gated__mosaic">
      <NuxtLink :to="to" class="gated__cta">
        <svg><use href="#i-lock" /></svg>{{ label }}
      </NuxtLink>
    </div>
  </div>
</template>
