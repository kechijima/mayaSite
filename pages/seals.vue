<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { SEALS, sealColor } from '~/utils/mayaData'
import { fetchPublishedDoc } from '~/composables/useDiagnosisContent'

// 20の紋章の一覧(2026-11-19 要望: 「20の紋章って何があるのか」)。
// 配置と順番は mayadan.jp/character に合わせる: 上に Red / White / Blue / Yellow の目次、
// 色ごとに5つずつ(赤い竜・赤い蛇・赤い月・赤い空歩く人・赤い地球 …)。紋章の番号 i の色は i % 4
// (utils/mayaData.ts の sealColor)なので、色ごとに i の小さい順に並べるとこの順になる。
// 各行は顔のアイコンを女性・男性で並べ、英語名・紋章名・タイプ名を添える。押すとその紋章のページ(/kin/N)へ。
// mayadan のキャラクター名(人名)は先方の創作物なので使わず、このサイトのタイプ名(CMS の archetype)を出す。

const GROUPS = [
  { key: 'red', label: 'Red', jp: '赤' },
  { key: 'white', label: 'White', jp: '白' },
  { key: 'blue', label: 'Blue', jp: '青' },
  { key: 'yellow', label: 'Yellow', jp: '黄' }
] as const

const groups = GROUPS.map((g) => ({
  ...g,
  seals: SEALS.map((s, index) => ({ ...s, index })).filter((s) => sealColor(s.index) === g.key)
}))

// タイプ名(「勇者タイプ」など)。20件まとめて読む。読めなくても一覧は出す。
const { data: archetypes } = useAsyncData(
  'seal-archetypes',
  async () => {
    const firestore = useNuxtApp().$firestore as Firestore
    const docs = await Promise.all(SEALS.map((_, i) => fetchPublishedDoc(firestore, `character-${i}`).catch(() => null)))
    return docs.map((d) => d?.archetype?.trim() ?? '')
  },
  { server: false, lazy: true, default: () => [] as string[] }
)
</script>

<template>
  <div class="paper-page paper-page--header min-h-screen">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">Character</span>
        <h1 class="font-display masthead__title">20の紋章</h1>
        <p class="masthead__sub">マヤ暦の20の紋章と、それぞれのキャラクターをご紹介します。</p>
      </div>

      <nav class="sealtoc" aria-label="色で選ぶ">
        <a v-for="g in groups" :key="g.key" :href="`#${g.key}`" class="sealtoc__link" :class="`is-${g.key}`">
          {{ g.label }}<svg aria-hidden="true"><use href="#i-arrow-right" /></svg>
        </a>
      </nav>

      <section v-for="g in groups" :id="g.key" :key="g.key" class="sealgroup" :class="`is-${g.key}`">
        <h2 class="sealgroup__title font-display">
          <span aria-hidden="true">❦</span>{{ g.label }}<span aria-hidden="true">❦</span>
        </h2>
        <ul class="seallist">
          <li v-for="(s, i) in g.seals" :key="s.index">
            <NuxtLink :to="`/kin/${s.index}`" class="sealrow" :class="{ 'is-rev': i % 2 === 1 }">
              <span class="sealrow__faces">
                <MayaGlyph :seal-index="s.index" gender="female" size="xl" />
                <MayaGlyph :seal-index="s.index" gender="male" size="xl" />
              </span>
              <span class="sealrow__band">
                <span class="sealrow__en font-display">{{ s.english }}</span>
                <span class="sealrow__name">{{ s.name }}</span>
                <span class="sealrow__rule" aria-hidden="true" />
                <span class="sealrow__type">{{ archetypes[s.index] || s.keyword }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
