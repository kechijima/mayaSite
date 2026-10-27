<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { NEUTRAL_PENALTY_THRESHOLD, TEST_CATEGORY_KEYS, TEST_MAX_SCORE, type TestCategoryKey } from '~/utils/achievementTest'
import {
  DEFAULT_TEST_DISPLAY_SETTINGS,
  TEST_BAND_RANGE,
  TEST_CATEGORY_LABEL,
  bandIndexFor,
  categoryPercent,
  isSafeExternalUrl,
  normalizeFeedback,
  type FeedbackTexts,
  type TestDisplaySettings
} from '~/utils/achievementTestFeedback'
import { fetchAchievementFeedback, fetchTestDisplaySettings } from '~/utils/achievementTestResults'
import { isGender, type Gender } from '~/utils/gender'

// 到達度診断テストの結果1回ぶん(2026-10-27、手書きのレイアウト案どおり)。受けた直後(/test/take)と
// 過去の結果(/test/result/[id])で共用する。
//
//   PC:     [キャラクター全身像] [合計％ + カテゴリ別％]
//           [段階(4つ並べて該当を強調)] [カテゴリごとのフィードバック文]
//           [購入を促す文言 + カード3枚]
//   スマホ: 上から キャラ → 合計 → カテゴリ → 段階 → フィードバック → カード
//
// 段階は合計点で決め、フィードバック文はカテゴリごとにそのカテゴリの段階の文を出す
// (utils/achievementTestFeedback.ts)。文と表示設定は Firestore から読み、読めなければ文は出さず
// 設定は既定値で表示する(結果そのものは手元の点数だけで出せるので、画面は止めない)。
const props = defineProps<{
  sealIndex: number
  sealName: string
  gender?: string | null
  total: number
  categoryScores: Record<TestCategoryKey, number>
  neutralCount: number
  penalty: number
  takenAtLabel?: string
}>()

const { cutoutSrc } = useSealCutouts()
const gender = computed<Gender>(() => (props.gender && isGender(props.gender) ? props.gender : 'female'))
const portrait = computed(() => cutoutSrc(props.sealIndex, gender.value))

const rawTotal = computed(() => TEST_CATEGORY_KEYS.reduce((n, k) => n + (props.categoryScores[k] ?? 0), 0))
const totalBand = computed(() => bandIndexFor(props.total))
const categories = computed(() =>
  TEST_CATEGORY_KEYS.map((key) => {
    const percent = categoryPercent(props.categoryScores[key] ?? 0)
    return { key, label: TEST_CATEGORY_LABEL[key], percent, band: bandIndexFor(percent) }
  })
)

const feedback = ref<FeedbackTexts>(normalizeFeedback(null))
const settings = ref<TestDisplaySettings>(DEFAULT_TEST_DISPLAY_SETTINGS)
const loading = ref(true)
useLoadingWhile('test-result-sheet', () => loading.value)

watch(
  () => props.sealIndex,
  async (sealIndex) => {
    loading.value = true
    const firestore = useNuxtApp().$firestore as Firestore
    const [f, s] = await Promise.allSettled([fetchAchievementFeedback(firestore, sealIndex), fetchTestDisplaySettings(firestore)])
    feedback.value = f.status === 'fulfilled' ? f.value : normalizeFeedback(null)
    settings.value = s.status === 'fulfilled' ? s.value : DEFAULT_TEST_DISPLAY_SETTINGS
    loading.value = false
  },
  { immediate: true }
)

const feedbackItems = computed(() =>
  categories.value
    .map((c) => ({ ...c, text: feedback.value[c.key][c.band]?.trim() ?? '' }))
    .filter((c) => c.text)
)

const products = computed(() =>
  settings.value.products.map((p) => ({ ...p, href: !p.comingSoon && isSafeExternalUrl(p.url) ? p.url.trim() : null }))
)
</script>

<template>
  <div class="testresult">
    <figure class="testresult__art">
      <img :src="portrait" :alt="sealName" decoding="async" />
      <figcaption>{{ sealName }}</figcaption>
    </figure>

    <section class="panel panel--plan testresult__score">
      <div class="testresult__total">
        <span class="testresult__totallabel">TOTAL</span>
        <p><strong>{{ total }}</strong><small>％</small></p>
      </div>
      <p class="testscore__meta">
        {{ TEST_MAX_SCORE }}点満点中 {{ total }}点<template v-if="penalty">（25問の合計 {{ rawTotal }}点、「どちらでもない」{{ neutralCount }}つで {{ penalty }}点）</template><template v-else-if="neutralCount">（「どちらでもない」{{ neutralCount }}つ・{{ NEUTRAL_PENALTY_THRESHOLD }}つ未満なので減点なし）</template>
        <template v-if="takenAtLabel"><br />{{ takenAtLabel }}</template>
      </p>
      <ul class="testbars">
        <li v-for="c in categories" :key="c.key">
          <span class="testbars__label">{{ c.label }}</span>
          <span class="testbars__track"><i :style="{ width: `${c.percent}%` }" /></span>
          <span class="testbars__value">{{ c.percent }}%</span>
        </li>
      </ul>
    </section>

    <section class="panel testresult__bands" aria-label="到達度の段階">
      <p class="formlabel">あなたの到達度</p>
      <ol class="testbands">
        <li v-for="(range, i) in TEST_BAND_RANGE" :key="range" :class="{ 'is-current': i === totalBand }">
          <span class="testbands__range">{{ range }}</span>
          <span class="testbands__label">{{ settings.bands[i].label }}</span>
          <span v-if="i === totalBand" class="testbands__you">あなた</span>
        </li>
      </ol>
      <p v-if="settings.bands[totalBand].message" class="testbands__message">{{ settings.bands[totalBand].message }}</p>
    </section>

    <section v-if="feedbackItems.length" class="panel testresult__feedback" aria-label="フィードバック">
      <p class="formlabel">{{ sealName }}のあなたへのフィードバック</p>
      <dl class="testfeedback">
        <div v-for="c in feedbackItems" :key="c.key">
          <dt>{{ c.label }}<span>{{ c.percent }}%</span></dt>
          <dd>{{ c.text }}</dd>
        </div>
      </dl>
    </section>

    <section class="testresult__cta" aria-label="おすすめの講座">
      <p class="testcta__lead">マヤ暦で、もっと運気を上げたいあなたへ</p>
      <p class="testcta__sub">紋章の力を日々の暮らしに生かす学びを用意しています。</p>
      <ul class="testcta__cards">
        <li v-for="p in products" :key="p.key" class="testcta__card" :class="{ 'is-soon': p.comingSoon }">
          <span v-if="p.comingSoon" class="testcta__soon">Coming soon</span>
          <p class="testcta__name">{{ p.name }}</p>
          <p v-if="p.price !== null && !p.comingSoon" class="testcta__price">￥{{ p.price.toLocaleString('ja-JP') }}<small>（税込）</small></p>
          <a v-if="p.href" :href="p.href" target="_blank" rel="noopener noreferrer" class="btn-gold">詳しく見る</a>
          <span v-else class="testcta__disabled">{{ p.comingSoon ? '準備中です' : 'ご案内準備中' }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
