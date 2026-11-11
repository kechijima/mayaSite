<script setup lang="ts">
// 規約類3ページの末尾に置く相互リンクと「トップへ戻る」。表示中のページ自身は出さない。
import { LEGAL_LINKS } from '~/utils/legalInfo'

const route = useRoute()
const others = computed(() => LEGAL_LINKS.filter((l) => l.to !== route.path))
</script>

<template>
  <nav class="legallinks" aria-label="規約・表記">
    <NuxtLink v-for="link in others" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
  </nav>
  <NuxtLink to="/" class="mt-4 flex justify-center text-[12px] hover:underline" style="color: var(--ink-faint);">
    トップへ戻る
  </NuxtLink>
</template>
