<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  CATEGORY_MAX_SCORE,
  TEST_ANSWERS,
  TEST_ANSWER_LABEL,
  TEST_MAX_SCORE,
  flattenQuestions,
  scoreTest,
  type AchievementTestDoc,
  type TestAnswer,
  type TestScore
} from '~/utils/achievementTest'
import { fetchAchievementTest, saveTestResult } from '~/utils/achievementTestResults'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { SEALS } from '~/utils/mayaData'

// 到達度診断テストの受験画面。本人の太陽の紋章の 25 問をカテゴリごとに並べ、全問答えたら
// 採点して users/{uid}/testResults に保存し、結果(総合点とカテゴリ別の割合)を出す。
// 原本(Google フォーム)と同じく1画面に全問を並べる。途中でページを離れると記録は残らない。
const { access, user, profile, loginLink, accountLink } = useTestAccess()
const { withLoading } = useGlobalLoading()

const sealIndex = computed(() => {
  const birthdate = profile.value?.birthdate
  if (!birthdate) return null
  try {
    return diagnoseBirthdate(birthdate).birth.sealIndex
  } catch {
    return null
  }
})

const test = ref<AchievementTestDoc | null>(null)
const loadState = ref<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle')
const answers = ref<Record<number, TestAnswer>>({})
const result = ref<TestScore | null>(null)
const saveError = ref('')
const saved = ref(false)
const showUnanswered = ref(false)

const flat = computed(() => (test.value ? flattenQuestions(test.value) : []))
const answeredCount = computed(() => Object.keys(answers.value).length)
const firstUnanswered = computed(() => flat.value.find((q) => !answers.value[q.index])?.index ?? null)

watch(
  [access, sealIndex],
  async ([a, s]) => {
    if (a !== 'ok' || s === null || loadState.value !== 'idle') return
    loadState.value = 'loading'
    try {
      const { $firestore } = useNuxtApp()
      const doc = await fetchAchievementTest($firestore as Firestore, s)
      test.value = doc
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
  if (!test.value || !user.value) return
  if (firstUnanswered.value !== null) {
    showUnanswered.value = true
    document.getElementById(`q-${firstUnanswered.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const list = flat.value.map((q) => answers.value[q.index])
  saveError.value = ''
  try {
    result.value = await withLoading(() => saveTestResult(useNuxtApp().$firestore as Firestore, user.value!.uid, test.value!, list))
    saved.value = true
  } catch (err) {
    // 保存だけ失敗しても採点結果は見せる(受験中にチームから外された・停止されたとき)。
    result.value = scoreTest(test.value, list)
    saveError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '結果を保存できませんでした。チーム会員の方のみ記録が残ります。'
      : '結果を保存できませんでした。時間をおいて再度お試しください。'
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function retry() {
  answers.value = {}
  result.value = null
  saved.value = false
  saveError.value = ''
  showUnanswered.value = false
  window.scrollTo({ top: 0 })
}

const sealName = computed(() => (sealIndex.value === null ? '' : SEALS[sealIndex.value].name))
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">到達度診断テスト</h1>
        <p v-if="sealName" class="masthead__sub"><strong>{{ sealName }}</strong><template v-if="!result">　それぞれの文について、自分にあてはまるものを選んでください。</template></p>
      </div>

      <div class="mx-auto mt-8 max-w-[620px] space-y-4">
        <TestAccessNotice :access="access" :login-link="loginLink" :account-link="accountLink" />

        <template v-if="access === 'ok'">
          <section v-if="sealIndex === null" class="panel text-center">
            <p class="mb-4 text-[13.5px]" style="color: var(--ink-soft);">生年月日が登録されていないため紋章を求められません。</p>
            <NuxtLink to="/account" class="btn-outline">マイページで登録する</NuxtLink>
          </section>
          <section v-else-if="loadState === 'loading' || loadState === 'idle'" class="panel">
            <p class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>
          </section>
          <section v-else-if="loadState === 'missing'" class="panel text-center">
            <p class="mb-4 text-[13.5px]" style="color: var(--ink-soft);">{{ sealName }}の問題はまだ用意されていません。</p>
            <NuxtLink to="/test" class="btn-outline">戻る</NuxtLink>
          </section>
          <section v-else-if="loadState === 'error'" class="panel">
            <p class="notice">問題を読み込めませんでした。時間をおいて再度お試しください。</p>
          </section>

          <!-- 結果 -->
          <template v-else-if="result">
            <section class="panel panel--plan text-center">
              <p class="formlabel">結果</p>
              <p class="testscore__total"><strong>{{ result.total }}</strong><small>／{{ TEST_MAX_SCORE }}点</small></p>
              <p class="testscore__meta">
                25問の合計 {{ result.rawTotal }}点<template v-if="result.neutralCount">、「どちらでもない」{{ result.neutralCount }}つで {{ result.penalty }}点</template>
              </p>
              <ul class="testbars mt-4 text-left">
                <li v-for="c in result.categories" :key="c.key">
                  <span class="testbars__label">{{ c.name }}</span>
                  <span class="testbars__track"><i :style="{ width: `${(c.score / c.max) * 100}%` }" /></span>
                  <span class="testbars__value">{{ Math.round((c.score / c.max) * 100) }}%</span>
                </li>
              </ul>
              <p v-if="saved" class="mt-4 text-[12px]" style="color: var(--ink-faint);">結果を記録しました。</p>
              <p v-else-if="saveError" class="notice mt-4">{{ saveError }}</p>
              <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" class="btn-gold" @click="retry">もう一度受ける</button>
                <NuxtLink to="/test" class="btn-outline">結果一覧へ</NuxtLink>
              </div>
            </section>
          </template>

          <!-- 出題 -->
          <form v-else-if="test" class="space-y-4" @submit.prevent="submit">
            <section v-for="category in test.categories" :key="category.key" class="panel survey">
              <h2 class="survey__title">{{ category.name }}</h2>
              <p class="survey__desc">{{ category.description }}</p>
              <ol class="survey__list">
                <li
                  v-for="q in flat.filter((f) => f.category === category)"
                  :id="`q-${q.index}`"
                  :key="q.index"
                  class="survey__item"
                  :class="{ 'is-missing': showUnanswered && !answers[q.index] }"
                >
                  <p class="survey__q"><span class="survey__num">{{ q.index + 1 }}</span>{{ q.question.text }}</p>
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

        <NuxtLink to="/test" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
