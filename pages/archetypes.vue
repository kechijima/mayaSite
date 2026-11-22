<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { SEALS, sealColor } from '~/utils/mayaData'
import { fetchPublishedDoc } from '~/composables/useDiagnosisContent'

// アーキタイプ一覧(20の紋章の一覧。2026-11-19 要望: 「20の紋章って何があるのか」)。
// 2026-11-22: 名前を「20の紋章」から「アーキタイプ一覧」に、パスを /seals から /archetypes に変更
// (「今日のアーキタイプ」と言葉をそろえる要望)。旧 /seals の転送は残さない(要望)。
// 配置と順番は mayadan.jp/character に合わせる: 上に赤・白・青・黄の目次、
// 色ごとに5つずつ(赤い竜・赤い蛇・赤い月・赤い空歩く人・赤い地球 …)。紋章の番号 i の色は i % 4
// (utils/mayaData.ts の sealColor)なので、色ごとに i の小さい順に並べるとこの順になる。
// 各紋章は診断結果の「KINの関係性」と同じカードで、胸像を女性・男性で並べる(2026-11-19 要望で顔の丸アイコンから変更)。
// 紋章名・タイプ名を添え(英語名は 2026-11-22 要望で削除。他の画面で使っていないため)、押すとその紋章のページ(/kin/N)へ。胸像はカードの枠から上へはみ出させ、
// 「詳しく見る」ボタンは出さない(2026-11-19 要望。カード全体がリンク)。キャラクターは色ごとに左・右・左…と交互に置く(PC のみ。
// スマホは縦積みなので変わらない)。
// mayadan のキャラクター名(人名)は先方の創作物なので使わず、このサイトのタイプ名(CMS の archetype)を出す。

const GROUPS = [
  // 色の表記は日本語(2026-11-22 要望: 他の画面に英語の見出しが無いので揃える。mayadan は Red などの英語)
  { key: 'red', label: '赤の紋章' },
  { key: 'white', label: '白の紋章' },
  { key: 'blue', label: '青の紋章' },
  { key: 'yellow', label: '黄の紋章' }
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

// 一番下のピッタリ到達度テストへのボタン(2026-11-22 要望)。診断済みならその KIN・性別を渡す
// (固定フッターと同じ行き先)。未診断なら /test 側が「まず無料診断へ」を案内する。
// このページでは固定フッター(TestFloatingCta)は出さない(layouts/default.vue)。
const { testLink } = useLastDiagnosis()
</script>

<template>
  <div class="paper-page paper-page--header min-h-screen">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">Character</span>
        <h1 class="font-display masthead__title">アーキタイプ一覧</h1>
        <p class="masthead__sub">マヤ暦の20の紋章と、それぞれのタイプ・キャラクターをご紹介します。</p>
      </div>

      <nav class="sealtoc" aria-label="色で選ぶ">
        <a v-for="g in groups" :key="g.key" :href="`#${g.key}`" class="sealtoc__link" :class="`is-${g.key}`">
          {{ g.label }}
        </a>
      </nav>

      <section v-for="g in groups" :id="g.key" :key="g.key" class="sealgroup" :class="`is-${g.key}`">
        <h2 class="sealgroup__title">
          {{ g.label }}
        </h2>
        <!-- 診断結果の「KINの関係性」と同じカード(.relcard)に、胸像を女性・男性で並べる(2026-11-19 要望) -->
        <div class="relwrap sealcards">
          <NuxtLink
            v-for="(s, i) in g.seals"
            :key="s.index"
            :to="`/kin/${s.index}`"
            class="relcard relcard--link"
            :class="[`relcard--${g.key}`, { 'is-rev': i % 2 === 1 }]"
          >
            <div class="relcard__figure sealcards__figure">
              <MayaBust :seal-index="s.index" gender="female" :alt="`${s.name}（女性）`" />
              <MayaBust :seal-index="s.index" gender="male" :alt="`${s.name}（男性）`" />
            </div>
            <div class="relcard__body">
              <!-- 長い紋章名(白い世界の橋渡し)は「の」の後ろでだけ折り返す(スマホの横並びで幅が狭いため) -->
              <h3 class="font-display relcard__name"><template v-for="(part, pi) in s.name.split(/(?<=の)/)" :key="pi"><wbr v-if="pi" />{{ part }}</template></h3>
              <!-- 3行目はタイプ名(2026-11-19 要望でキーワードの説明から差し替え) -->
              <p v-if="archetypes[s.index]" class="relcard__desc sealcards__type">{{ archetypes[s.index] }}</p>
            </div>
          </NuxtLink>
        </div>
      </section>

      <div class="archtest">
        <p class="archtest__lead">あなたの紋章らしさは、どこまで身についている？</p>
        <NuxtLink :to="testLink" class="btn-gold">ピッタリ到達度テストを受ける</NuxtLink>
      </div>
    </div>
  </div>
</template>
