<script setup lang="ts">
import { type ProfileSection, iconFor } from '~/utils/profileSections'

// 診断結果ページのプロフィール項目を連続した .block として描画する。無料表示・有料表示
// (LockedVeilの中)・ロック解除後表示のいずれからも同じマークアップを使うための共通化。
defineProps<{ sections: ProfileSection[] }>()
</script>

<template>
  <!-- ラベル無しのセクション(cautionDetailPremium)は「注意すべき傾向」の続きなので、
       独立した見出し付きブロックではなく直前のブロックの続きとして詰めて描画する
       (.block--cont が上の区切り線とマージンを打ち消す)。 -->
  <div v-for="s in sections" :key="s.label" class="block" :class="{ 'block--cont': !s.label }">
    <div v-if="s.label" class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
    <p v-if="s.kind === 'text'">{{ s.text }}</p>
    <ul v-else class="checklist">
      <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
    </ul>
    <p v-if="s.kind === 'list-then-text' && s.text">{{ s.text }}</p>
  </div>
</template>
