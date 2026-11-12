<script setup lang="ts">
// 利用規約・プライバシーポリシーの共通レイアウト。本文は各ページが LegalSection[] で渡す。
// 特定商取引法に基づく表記は表形式なので使わず、末尾の相互リンク(LegalLinks)だけ共有する。
import type { LegalDates, LegalSection } from '~/utils/legalInfo'

defineProps<{
  title: string
  intro?: string
  sections: LegalSection[]
  dates: LegalDates
}>()

function isBullets(block: unknown): block is { bullets: string[] } {
  return typeof block === 'object' && block !== null && 'bullets' in block
}
</script>

<template>
  <div class="paper-page">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">LEGAL</span>
        <h1 class="font-display masthead__title">{{ title }}</h1>
      </div>

      <div class="mx-auto mt-8 max-w-[720px]">
        <article class="panel legaldoc">
          <p v-if="intro" class="legaldoc__intro">{{ intro }}</p>
          <section v-for="(section, i) in sections" :key="i" class="legaldoc__section">
            <h2 class="legaldoc__heading">{{ section.heading }}</h2>
            <template v-for="(block, j) in section.body" :key="j">
              <ol v-if="Array.isArray(block)" class="legaldoc__items">
                <li v-for="(item, k) in block" :key="k">{{ item }}</li>
              </ol>
              <ul v-else-if="isBullets(block)" class="legaldoc__bullets">
                <li v-for="(item, k) in block.bullets" :key="k">{{ item }}</li>
              </ul>
              <p v-else>{{ block }}</p>
            </template>
          </section>
          <p class="legaldoc__dates">
            {{ dates.enacted }} 制定<template v-if="dates.revised"><br />{{ dates.revised }} 改定</template>
          </p>
        </article>
        <LegalLinks />
      </div>
    </div>
  </div>
</template>
