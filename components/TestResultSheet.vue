<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { TEST_CATEGORY_KEYS, type TestCategoryKey } from '~/utils/achievementTest'
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
import scrollImage from '~/assets/images/optimized/test-scroll.webp'

// ピッタリ到達度テストの結果1回ぶん(2026-10-27、手書きのレイアウト案どおり)。受けた直後(/test/take)と
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
  // 結果をぼかす(チーム会員・有料会員以外。2026-11-19 に全員へ開放したときに追加)。
  // ぼかすときは本当の点数・段階・フィードバック文を DOM に出さない(LockedVeil と同じ考え方 —
  // ブラーを掛けても値が DOM にあれば開発者ツールで読めてしまう)。フィードバック文は読みにも行かない。
  locked?: boolean
  // ぼかしたときの「結果を見る」ボタンの行き先(/plans)
  unlockTo?: string
}>()

const { cutoutSrc } = useSealCutouts()
const gender = computed<Gender>(() => (props.gender && isGender(props.gender) ? props.gender : 'female'))
const portrait = computed(() => cutoutSrc(props.sealIndex, gender.value))

const archetype = useSealArchetype(toRef(props, 'sealIndex'))

// ぼかすときに代わりに並べる見せかけの値(本当の値は使わない)
const DUMMY_PERCENTS = [70, 40, 90, 60, 50]
const totalBand = computed(() => (props.locked ? -1 : bandIndexFor(props.total)))
const categories = computed(() =>
  TEST_CATEGORY_KEYS.map((key, i) => {
    const percent = props.locked ? DUMMY_PERCENTS[i] : categoryPercent(props.categoryScores[key] ?? 0)
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
    const [f, s] = await Promise.allSettled([
      props.locked ? Promise.resolve(normalizeFeedback(null)) : fetchAchievementFeedback(firestore, sealIndex),
      fetchTestDisplaySettings(firestore)
    ])
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

// 巻物(2026-11-02)。結果全体を巻物の紙の上に載せる。画像は scripts/makeTestScroll.py が作る 9 分割用の1枚で、
// CSS の border-image で「上の軸 / 縦に繰り返す紙 / 下の軸」に組む(内容が長いほど紙が伸びる)。
// 読み込み(フィードバック文・表示設定)が終わったら is-open を付けて、上から開くアニメーションを始める。
const scrollStyle = { '--scroll-img': `url(${scrollImage})` }

// 講座の価格は会員かどうかで出し分ける(2026-11-24 要望。それまでは会員・非会員の両方を併記)。
// 会員 = 有料会員・チーム会員(利用停止でない)には会員価格、それ以外(無料会員・未ログイン・利用停止中)には
// 非会員価格。非会員価格が未設定の講座は全員に同じ価格を出す。
// 会員かどうかは locked の逆を使う(呼び出し側の useTestAccess で locked = access !== 'ok'、ok = 有料会員・チーム会員)。
// ここで useEntitlement を呼ぶと、マウントのたびに判定の読み込みがやり直しになり、読み込み中は呼び出し側が
// 「通信中…」で結果を隠す → 結果が出るとまた読み込む、の繰り返しで止まる(2026-11-24 に発生)ので呼ばない。
const isMember = computed(() => !props.locked)
const products = computed(() =>
  settings.value.products.map((p) => {
    const split = p.price !== null && p.nonMemberPrice !== null
    return {
      ...p,
      href: !p.comingSoon && isSafeExternalUrl(p.url) ? p.url.trim() : null,
      shownPrice: !split ? p.price : isMember.value ? p.price : p.nonMemberPrice,
      priceLabel: split ? (isMember.value ? '会員価格' : '非会員価格') : null
    }
  })
)
</script>

<template>
  <div class="testscroll" :class="{ 'is-open': !loading }" :style="scrollStyle">
    <div class="testscroll__paper" aria-hidden="true" />
    <!-- 開くアニメーションの間だけ動く下の巻き軸(紙の下の軸と同じ絵を、開いていく端に重ねる) -->
    <div class="testscroll__roller" aria-hidden="true" />
    <div class="testscroll__body">
      <div class="testresult">
        <figure class="testresult__art">
          <img :src="portrait" :alt="sealName" decoding="async" />
          <!-- 紋章名とタイプ名を大きく(2026-11-19 要望) -->
          <figcaption>
            <span class="testresult__seal">{{ sealName }}</span>
            <span v-if="archetype" class="testresult__type">{{ archetype }}</span>
          </figcaption>
        </figure>

        <section class="panel panel--plan testresult__score" :class="{ 'is-locked': locked }">
          <div class="testresult__total">
            <span class="testresult__totallabel">TOTAL</span>
            <p><strong>{{ locked ? '??' : total }}</strong><small>％</small></p>
          </div>
          <ul class="testbars">
            <li v-for="c in categories" :key="c.key">
              <span class="testbars__label">{{ c.label }}</span>
              <span class="testbars__track"><i :style="{ width: `${c.percent}%` }" /></span>
              <span class="testbars__value">{{ c.percent }}%</span>
            </li>
          </ul>
        </section>

        <section class="panel testresult__bands" :class="{ 'is-locked': locked }" aria-label="到達度の段階">
          <p class="formlabel">あなたの到達度</p>
          <ol class="testbands">
            <li v-for="(range, i) in TEST_BAND_RANGE" :key="range" :class="{ 'is-current': i === totalBand }">
              <span class="testbands__range">{{ range }}</span>
              <span class="testbands__label">{{ settings.bands[i].label }}</span>
              <span v-if="i === totalBand" class="testbands__you">あなた</span>
            </li>
          </ol>
          <p v-if="totalBand >= 0 && settings.bands[totalBand].message" class="testbands__message">{{ settings.bands[totalBand].message }}</p>
        </section>

        <!-- ぼかした結果の案内。点数・段階・フィードバックは有料会員(またはチーム会員)になると見られる -->
        <section v-if="locked" class="panel testresult__feedback testlock" aria-label="結果の続き">
          <div class="testlock__mosaic" aria-hidden="true">
            <p>思考 ― あなたの紋章らしい考え方が、日々の判断の中でどこまで生きているかをお伝えします。</p>
            <p>行動 ― 紋章の力を行動に移すときの、あなたならではの強みと伸ばし方をまとめています。</p>
            <p>人間関係 ― 周りとの関わりの中で、紋章の力をどう発揮できているかを読み解きます。</p>
          </div>
          <div class="testlock__pitch">
            <p class="testlock__kicker"><svg><use href="#i-lock" /></svg>あなたの到達度とフィードバック</p>
            <p class="testlock__lead">有料会員になると、点数・到達度の段階・{{ sealName }}のあなたへのフィードバックをすべてご覧いただけます。</p>
            <NuxtLink :to="unlockTo ?? '/plans'" class="btn-gold">結果を見る</NuxtLink>
          </div>
        </section>

        <section v-else-if="feedbackItems.length" class="panel testresult__feedback" aria-label="フィードバック">
          <p class="formlabel">{{ sealName }}のあなたへのフィードバック</p>
          <dl class="testfeedback">
            <div v-for="c in feedbackItems" :key="c.key">
              <dt>{{ c.label }}<span>{{ c.percent }}%</span></dt>
              <dd>{{ c.text }}</dd>
            </div>
          </dl>
        </section>

        <section class="testresult__cta" aria-label="おすすめの講座">
          <!-- 購入の見出しは強調する(2026-11-03 要望)。改行は「マヤ暦で、」の後ろだけで起きるように span で区切る -->
          <p class="testcta__eyebrow">FOR YOUR FORTUNE</p>
          <h2 class="testcta__lead"><span>マヤ暦で、</span><span>もっと運気を上げたいあなたへ</span></h2>
          <span class="testcta__ornament" aria-hidden="true"><i /></span>
          <p class="testcta__sub">紋章の力を日々の暮らしに生かす学びを用意しています。</p>
          <ul class="testcta__cards">
            <li v-for="p in products" :key="p.key" class="testcta__card" :class="{ 'is-soon': p.comingSoon }">
              <span v-if="p.comingSoon" class="testcta__soon">Coming soon</span>
              <p class="testcta__name">{{ p.name }}</p>
              <!-- 会員(有料会員・チーム会員)には会員価格、それ以外には非会員価格の1つだけ(2026-11-24 要望) -->
              <p v-if="!p.comingSoon && p.shownPrice !== null" class="testcta__price">
                <span v-if="p.priceLabel" class="testcta__pricelabel">{{ p.priceLabel }}</span>￥{{ p.shownPrice.toLocaleString('ja-JP') }}<small>（税込）</small>
              </p>
              <a v-if="p.href" :href="p.href" target="_blank" rel="noopener noreferrer" class="btn-gold">詳しく見る</a>
              <span v-else class="testcta__disabled">{{ p.comingSoon ? '準備中です' : 'ご案内準備中' }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
