<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  TEST_ANSWERS,
  TEST_ANSWER_LABEL,
  flattenQuestions,
  scoreTest,
  type AchievementTestDoc,
  type TestAnswer,
  type TestCategoryKey,
  type TestScore
} from '~/utils/achievementTest'
import { fetchAchievementTest, saveTestResult } from '~/utils/achievementTestResults'
import { SEALS } from '~/utils/mayaData'

// ピッタリ到達度テストの受験画面。太陽の紋章の 25 問を1画面に並べ、全問答えたら採点して結果
// (総合点とカテゴリ別の割合)を出す。途中でページを離れると記録は残らない。
// 2026-11-19: 全員に開放(composables/useTestAccess.ts)。会員は自分の紋章で受けて
// users/{uid}/testResults に保存、未ログインは診断結果から渡された ?kin= の紋章で受けて保存しない。
// チーム会員・有料会員以外は結果をぼかす。
// 2026-10-07: 出題はカテゴリ見出しを出さず、受けるたびに 25 問をランダムな順に並べる(要望)。
// 並べ替えるのは表示だけで、answers は元の flattenQuestions() の添字(q.index)で持ち、保存も
// その順のまま — 採点・保存形式・管理画面の答案表示は変わらない。
const { access, locked, canSave, seal, sealQuery, user, loginLink, signupLink, plansLink } = useTestAccess()
const { withLoading } = useGlobalLoading()

const sealIndex = computed(() => seal.value?.sealIndex ?? null)
const archetype = useSealArchetype(sealIndex)
const startable = computed(() => access.value !== 'loading' && access.value !== 'suspended')

const test = ref<AchievementTestDoc | null>(null)
const loadState = ref<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle')
const answers = ref<Record<number, TestAnswer>>({})
const result = ref<TestScore | null>(null)
const saveError = ref('')
const saved = ref(false)
const showUnanswered = ref(false)

const flat = computed(() => (test.value ? flattenQuestions(test.value) : []))
// 表示順。flat の添字の並べ替えで、問題の読み込み時と「もう一度受ける」のたびに作り直す。
const order = ref<number[]>([])
const shuffled = computed(() => order.value.map((i) => flat.value[i]).filter(Boolean))
const answeredCount = computed(() => Object.keys(answers.value).length)
// 未回答の案内は画面の上から順に探す(表示順の最初の未回答へスクロールする)。
const firstUnanswered = computed(() => shuffled.value.find((q) => !answers.value[q.index])?.index ?? null)

function shuffleOrder() {
  const idx = flat.value.map((_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  order.value = idx
}

watch(
  [access, sealIndex],
  async ([a, s]) => {
    if (a === 'loading' || a === 'suspended' || s === null || loadState.value !== 'idle') return
    loadState.value = 'loading'
    try {
      const { $firestore } = useNuxtApp()
      const doc = await withLoading(() => fetchAchievementTest($firestore as Firestore, s))
      test.value = doc
      shuffleOrder()
      loadState.value = doc ? 'ready' : 'missing'
    } catch {
      loadState.value = 'error'
    }
  },
  { immediate: true }
)

function pick(index: number, answer: TestAnswer) {
  answers.value = { ...answers.value, [index]: answer }
}

async function submit() {
  if (!test.value) return
  if (firstUnanswered.value !== null) {
    showUnanswered.value = true
    document.getElementById(`q-${firstUnanswered.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const list = flat.value.map((q) => answers.value[q.index])
  saveError.value = ''
  if (!canSave.value || !user.value) {
    // 未ログインは記録しない(採点だけ)
    result.value = scoreTest(test.value, list)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  try {
    result.value = await withLoading(() => saveTestResult(useNuxtApp().$firestore as Firestore, user.value!.uid, test.value!, list))
    saved.value = true
  } catch (err) {
    // 保存だけ失敗しても採点結果は見せる(受験中にチームから外された・停止されたとき)。
    result.value = scoreTest(test.value, list)
    saveError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '結果を保存できませんでした。'
      : '結果を保存できませんでした。時間をおいて再度お試しください。'
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function retry() {
  shuffleOrder()
  answers.value = {}
  result.value = null
  saved.value = false
  saveError.value = ''
  showUnanswered.value = false
  window.scrollTo({ top: 0 })
}

const resultCategoryScores = computed(() => {
  const out = {} as Record<TestCategoryKey, number>
  for (const c of result.value?.categories ?? []) out[c.key] = c.score
  return out
})

const sealName = computed(() => (sealIndex.value === null ? '' : SEALS[sealIndex.value].name))
</script>

<template>
  <div class="paper-page paper-page--focus paper-page--header">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">ピッタリ到達度テスト</h1>
        <!-- 紋章名とタイプ名を大きく(2026-11-19 要望) -->
        <p v-if="sealName" class="testseal"><span class="testseal__name">{{ sealName }}</span><span v-if="archetype" class="testseal__type">{{ archetype }}</span></p>
        <p v-if="sealName && !result" class="masthead__sub">それぞれの文について、自分にあてはまるものを選んでください。</p>
      </div>

      <div class="mx-auto mt-8 space-y-4" :class="result ? 'max-w-[1000px]' : 'max-w-[620px]'">
        <TestAccessNotice :access="access" :seal="seal" :login-link="loginLink" />

        <template v-if="startable && seal">
          <template v-if="loadState === 'loading' || loadState === 'idle'" />
          <section v-else-if="loadState === 'missing'" class="panel text-center">
            <p class="mb-4 text-[13.5px]" style="color: var(--ink-soft);">{{ sealName }}の問題はまだ用意されていません。</p>
            <NuxtLink :to="{ path: '/test', query: sealQuery }" class="btn-outline">戻る</NuxtLink>
          </section>
          <section v-else-if="loadState === 'error'" class="panel">
            <p class="notice">問題を読み込めませんでした。時間をおいて再度お試しください。</p>
          </section>

          <!-- 結果(components/TestResultSheet.vue。/test/result/[id] と同じ見た目) -->
          <template v-else-if="result">
            <TestResultSheet
              :seal-index="sealIndex"
              :seal-name="sealName"
              :gender="seal.gender"
              :total="result.total"
              :category-scores="resultCategoryScores"
              :locked="locked"
              :unlock-to="plansLink"
            />
            <p v-if="saved" class="text-center text-[12px]" style="color: var(--ink-faint);">結果を記録しました。<template v-if="locked">有料会員になると、記録した結果もご覧いただけます。</template></p>
            <p v-else-if="saveError" class="notice">{{ saveError }}</p>
            <p v-else-if="access === 'guest'" class="text-center text-[12px] leading-[1.8]" style="color: var(--ink-faint);">
              ログインせずに受けた結果は記録されません。<NuxtLink :to="signupLink" class="underline">無料会員登録</NuxtLink>すると、受けた結果が残ります。
            </p>
            <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button type="button" class="btn-gold" @click="retry">もう一度受ける</button>
              <NuxtLink v-if="canSave" to="/test" class="btn-outline">結果一覧へ</NuxtLink>
            </div>
          </template>

          <!-- 出題 -->
          <form v-else-if="test" class="space-y-4" @submit.prevent="submit">
            <!-- カテゴリ見出しは出さず、ランダムな順の 25 問を1枚に並べる。番号は表示順。 -->
            <section class="panel survey">
              <ol class="survey__list">
                <li
                  v-for="(q, pos) in shuffled"
                  :id="`q-${q.index}`"
                  :key="q.index"
                  class="survey__item"
                  :class="{ 'is-missing': showUnanswered && !answers[q.index] }"
                >
                  <p class="survey__q"><span class="survey__num">{{ pos + 1 }}</span>{{ q.question.text }}</p>
                  <div class="survey__choices" role="radiogroup">
                    <button
                      v-for="a in TEST_ANSWERS"
                      :key="a"
                      type="button"
                      role="radio"
                      :aria-checked="answers[q.index] === a"
                      class="survey__choice"
                      :class="{ 'is-on': answers[q.index] === a }"
                      @click="pick(q.index, a)"
                    >{{ TEST_ANSWER_LABEL[a] }}</button>
                  </div>
                </li>
              </ol>
            </section>

            <div class="survey__submit">
              <p class="survey__count">{{ answeredCount }}／{{ flat.length }}問に回答</p>
              <p v-if="showUnanswered && firstUnanswered !== null" class="notice mb-3">まだ答えていない問題があります。</p>
              <button type="submit" class="btn-gold w-full">結果を見る</button>
            </div>
          </form>
        </template>

        <NuxtLink :to="{ path: '/test', query: sealQuery }" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
