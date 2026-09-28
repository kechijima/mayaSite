<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  PASS_RATIO,
  TEST_LEVEL_LABEL,
  TEST_LEVEL_TITLE,
  generateTest,
  isPassing,
  isTestLevel,
  scoreAnswers,
  type AnsweredQuestion,
  type TestQuestion
} from '~/utils/achievementTest'
import { saveTestResult } from '~/utils/achievementTestResults'

// 到達度テストの受験画面。1問ずつ出し、選んだ直後に正誤と解説を見せてから次へ進む。
// 最後まで答えたら結果を users/{uid}/testResults に保存して結果画面を出す。
// 出題はこの場で生成する(utils/achievementTest.ts)ので、通信は最後の保存1回だけ。
//
// 途中でページを離れると記録は残らない(保存は完了時のみ)。「途中保存」は要望が無いので作っていない。
const route = useRoute()
const level = computed(() => (isTestLevel(route.params.level) ? route.params.level : null))

const { access, user, loginLink, accountLink } = useTestAccess()
const { withLoading } = useGlobalLoading()

const questions = ref<TestQuestion[]>([])
const index = ref(0)
const selected = ref<number | null>(null)
const answers = ref<AnsweredQuestion[]>([])
const finished = ref(false)
const saveError = ref('')
const saved = ref(false)

const current = computed(() => questions.value[index.value] ?? null)
const score = computed(() => scoreAnswers(answers.value))
const passed = computed(() => isPassing(score.value, answers.value.length))
const wrongAnswers = computed(() => answers.value.filter((a) => a.selectedIndex !== a.answerIndex))

function start() {
  if (!level.value) return
  questions.value = generateTest(level.value)
  index.value = 0
  selected.value = null
  answers.value = []
  finished.value = false
  saveError.value = ''
  saved.value = false
}
start()

function choose(i: number) {
  // 一度選んだら変えられない(選んだ瞬間に正誤が見えるため)。
  if (selected.value !== null || !current.value) return
  selected.value = i
  answers.value.push({ ...current.value, selectedIndex: i })
}

async function next() {
  if (selected.value === null) return
  if (index.value + 1 < questions.value.length) {
    index.value++
    selected.value = null
    return
  }
  finished.value = true
  await save()
}

async function save() {
  if (!user.value || !level.value || saved.value) return
  saveError.value = ''
  try {
    await withLoading(() => saveTestResult(useNuxtApp().$firestore as Firestore, user.value!.uid, level.value!, answers.value))
    saved.value = true
  } catch (err) {
    // ルールで弾かれるのは、受験中にチームから外された・停止されたとき。結果は画面に出したまま、保存できなかったことだけ伝える。
    saveError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '結果を保存できませんでした。チーム会員の方のみ記録が残ります。'
      : '結果を保存できませんでした。時間をおいて再度お試しください。'
  }
}

const CHOICE_MARK = ['A', 'B', 'C', 'D']
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">
          <template v-if="level">{{ TEST_LEVEL_LABEL[level] }}　{{ TEST_LEVEL_TITLE[level] }}</template>
          <template v-else>到達度テスト</template>
        </h1>
      </div>

      <div class="mx-auto mt-8 max-w-[560px] space-y-4">
        <section v-if="!level" class="panel">
          <p class="mb-4 text-[13.5px]" style="color: var(--ink-soft);">指定された級が見つかりませんでした。</p>
          <NuxtLink to="/test" class="btn-outline">テスト一覧へ</NuxtLink>
        </section>

        <template v-else>
          <TestAccessNotice :access="access" :login-link="loginLink" :account-link="accountLink" />

          <!-- 出題中 -->
          <section v-if="access === 'ok' && !finished && current" class="panel quiz">
            <div class="quiz__progress" role="status">
              <span>第 {{ index + 1 }} 問 ／ {{ questions.length }} 問</span>
              <span class="quiz__kind">{{ current.kind }}</span>
            </div>
            <div class="quiz__bar" aria-hidden="true"><i :style="{ width: `${((index + (selected !== null ? 1 : 0)) / questions.length) * 100}%` }" /></div>
            <p class="quiz__prompt">{{ current.prompt }}</p>
            <ol class="quiz__choices">
              <li v-for="(c, i) in current.choices" :key="i">
                <button
                  type="button"
                  class="quiz__choice"
                  :class="{
                    'is-picked': selected === i,
                    'is-correct': selected !== null && i === current.answerIndex,
                    'is-wrong': selected === i && i !== current.answerIndex
                  }"
                  :disabled="selected !== null"
                  @click="choose(i)"
                >
                  <span class="quiz__mark">{{ CHOICE_MARK[i] }}</span>
                  <span>{{ c }}</span>
                </button>
              </li>
            </ol>
            <div v-if="selected !== null" class="quiz__feedback" :class="selected === current.answerIndex ? 'is-correct' : 'is-wrong'">
              <p class="quiz__verdict">{{ selected === current.answerIndex ? '正解' : '不正解' }}</p>
              <p class="quiz__explain">{{ current.explanation }}</p>
            </div>
            <button type="button" class="btn-gold mt-5 w-full" :disabled="selected === null" @click="next">
              {{ index + 1 < questions.length ? '次の問題へ' : '結果を見る' }}
            </button>
          </section>

          <!-- 結果 -->
          <template v-else-if="access === 'ok' && finished">
            <section class="panel panel--plan text-center">
              <p class="formlabel">結果</p>
              <p class="quiz__score"><strong>{{ score }}</strong><small>／{{ answers.length }}点</small></p>
              <p class="quiz__result" :class="passed ? 'is-pass' : 'is-fail'">
                {{ passed ? '合格' : 'もう一歩' }}
              </p>
              <p class="mt-2 text-[12.5px] leading-[1.9]" style="color: var(--ink-soft);">
                {{ passed
                  ? `${TEST_LEVEL_LABEL[level]}の内容は身についています。ほかの級にも挑戦してみましょう。`
                  : `合格ラインは ${Math.round(PASS_RATIO * 100)}% です。下の解説を見直して、もう一度挑戦してみましょう。` }}
              </p>
              <p v-if="saved" class="mt-3 text-[12px]" style="color: var(--ink-faint);">結果を記録しました。</p>
              <p v-else-if="saveError" class="notice mt-3">{{ saveError }}</p>
              <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button type="button" class="btn-gold" @click="start">もう一度受ける</button>
                <NuxtLink to="/test" class="btn-outline">テスト一覧へ</NuxtLink>
              </div>
            </section>

            <section v-if="wrongAnswers.length" class="panel">
              <p class="formlabel">見直しておきたい問題</p>
              <ol class="quiz__review">
                <li v-for="(a, i) in wrongAnswers" :key="i">
                  <p class="quiz__review-prompt">{{ a.prompt }}</p>
                  <p class="quiz__review-line"><span>あなたの答え</span>{{ a.choices[a.selectedIndex] }}</p>
                  <p class="quiz__review-line is-correct"><span>正解</span>{{ a.choices[a.answerIndex] }}</p>
                  <p class="quiz__explain">{{ a.explanation }}</p>
                </li>
              </ol>
            </section>
          </template>
        </template>

        <NuxtLink to="/test" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          テスト一覧へ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
