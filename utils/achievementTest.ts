// チーム会員向けの到達度診断テスト。本人の太陽の紋章ごとに用意された 25 問の自己診断アンケートで、
// 「その紋章らしさ」がどこまで身についているかを点数で見る(docs/到達度診断テスト/*.xlsx が原本)。
//
// 2026-09-29: それまでの「マヤ暦の知識を問う4択(初級/中級/上級)」を、この原本の形に置き換えた。
//
// 形式(原本どおり):
//   - 5カテゴリ(思考 / 行動 / 人間関係 / 信念 / スキル)× 5問 = 25問
//   - 回答は3択(そう思う / どちらでもない / 思わない)。問ごとに [4,2,0] か [0,2,4] の配点
//     (紋章らしい答えが 4 点)。カテゴリ 20 点満点、合計 100 点満点
//   - 「どちらでもない」が 5 つ以上のときだけ、その個数ぶん −1 点ずつ減点(4 つ以下は減点なし。
//     例: 4 つ → 0、5 つ → −5、7 つ → −7)。原本の集計表「どちらでもない減点」列がそうなっていて、
//     2026-09-30 に講師からもこのルールだと確認した(それまでは 1 つから減点していた — 誤り)
//   - 総合点 = 25問の合計 + 減点。カテゴリ別は 20 点に対する割合で見る(原本は 0.7 のような表示)
//
// 問題文は Firestore の achievementTests/{sealIndex} に置く(scripts/seedAchievementTests.ts)。
// チーム会員だけが読める(firestore.rules)ので、バンドルには含めない。
// scripts/ から tsx で読めるよう、~/ ではなく相対 import にしている。

export type TestAnswer = 'agree' | 'neutral' | 'disagree'
export const TEST_ANSWERS: TestAnswer[] = ['agree', 'neutral', 'disagree']
export const TEST_ANSWER_LABEL: Record<TestAnswer, string> = {
  agree: 'そう思う',
  neutral: 'どちらでもない',
  disagree: '思わない'
}
// scores 配列の並び([そう思う, どちらでもない, 思わない])に対応する添字
const ANSWER_INDEX: Record<TestAnswer, 0 | 1 | 2> = { agree: 0, neutral: 1, disagree: 2 }

export type TestCategoryKey = 'thinking' | 'action' | 'relationship' | 'belief' | 'skill'
export const TEST_CATEGORY_KEYS: TestCategoryKey[] = ['thinking', 'action', 'relationship', 'belief', 'skill']

export const QUESTIONS_PER_CATEGORY = 5
export const CATEGORY_MAX_SCORE = 20
export const TEST_MAX_SCORE = 100
export const NEUTRAL_PENALTY = -1
// 「どちらでもない」がこの個数以上で減点が始まる(この個数を含む)。
export const NEUTRAL_PENALTY_THRESHOLD = 5

export interface TestQuestion {
  text: string
  scores: [number, number, number]
}

export interface TestCategory {
  key: TestCategoryKey
  name: string
  description: string
  questions: TestQuestion[]
}

// achievementTests/{sealIndex}
export interface AchievementTestDoc {
  sealIndex: number
  sealName: string
  categories: TestCategory[]
  updatedAt?: unknown
}

export function questionCount(test: AchievementTestDoc): number {
  return test.categories.reduce((n, c) => n + c.questions.length, 0)
}

// 25 問を平らに並べたときの並び順(カテゴリ順 → 問順)。保存する answers はこの順。
export function flattenQuestions(test: AchievementTestDoc): { category: TestCategory; question: TestQuestion; index: number }[] {
  const out: { category: TestCategory; question: TestQuestion; index: number }[] = []
  for (const category of test.categories) {
    for (const question of category.questions) out.push({ category, question, index: out.length })
  }
  return out
}

export function pointsFor(question: TestQuestion, answer: TestAnswer): number {
  return question.scores[ANSWER_INDEX[answer]]
}

export interface CategoryScore {
  key: TestCategoryKey
  name: string
  score: number // 0〜20
  max: number // 20
}

export interface TestScore {
  categories: CategoryScore[]
  rawTotal: number // 25問の合計(0〜100)
  neutralCount: number
  penalty: number // neutralCount >= NEUTRAL_PENALTY_THRESHOLD のとき neutralCount × NEUTRAL_PENALTY、それ以外 0
  total: number // rawTotal + penalty。0 未満にはしない
}

// 採点。answers は flattenQuestions() の順で、全問そろっていること(未回答は呼び出し側で防ぐ)。
export function scoreTest(test: AchievementTestDoc, answers: TestAnswer[]): TestScore {
  const flat = flattenQuestions(test)
  if (answers.length !== flat.length) throw new Error(`answers must have ${flat.length} entries, got ${answers.length}`)
  const categories: CategoryScore[] = test.categories.map((c) => ({
    key: c.key,
    name: c.name,
    score: 0,
    max: c.questions.length * 4
  }))
  let neutralCount = 0
  flat.forEach(({ category, question }, i) => {
    const answer = answers[i]
    const pts = pointsFor(question, answer)
    categories[test.categories.indexOf(category)].score += pts
    if (answer === 'neutral') neutralCount++
  })
  const rawTotal = categories.reduce((n, c) => n + c.score, 0)
  const penalty = neutralCount >= NEUTRAL_PENALTY_THRESHOLD ? neutralCount * NEUTRAL_PENALTY : 0
  return { categories, rawTotal, neutralCount, penalty, total: Math.max(0, rawTotal + penalty) }
}

// users/{uid}/testResults/{autoId}。1回の受験ぶん。問題文は保存せず、answers と紋章で復元できる
// (問題が後から直っても、受けた当時の答えは answers に残る)。
export interface TestResultDoc {
  sealIndex: number
  sealName: string
  answers: TestAnswer[]
  categoryScores: Record<TestCategoryKey, number>
  neutralCount: number
  penalty: number
  total: number
  takenAt: unknown // serverTimestamp() で書き、読むときは Timestamp
}

export function isTestAnswer(value: unknown): value is TestAnswer {
  return typeof value === 'string' && (TEST_ANSWERS as string[]).includes(value)
}
