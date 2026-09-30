// 到達度診断テストの採点(utils/achievementTest.ts の scoreTest)が原本のルールどおりかを検証する。
// エミュレータ不要。実行: npm run verify:scoring
//
// ルール(docs/到達度診断テスト の集計表と、2026-09-30 の講師の説明):
//   - 各問 [そう思う, どちらでもない, 思わない] = [4,2,0] か [0,2,4]。カテゴリ 20 点、合計 100 点
//   - 「どちらでもない」が 5 つ以上のときだけ、その個数ぶん −1 点(4 つ以下は減点なし)
//   - 総合点 = 合計 + 減点。0 未満にはしない
import { ACHIEVEMENT_TEST_SEED } from './achievementTests.data'
import { NEUTRAL_PENALTY_THRESHOLD, flattenQuestions, scoreTest, type AchievementTestDoc, type TestAnswer } from '../utils/achievementTest'

let passed = 0
let failed = 0
function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    passed++
    console.log(`  \x1b[32m✓\x1b[0m ${label}`)
  } else {
    failed++
    console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `\n      ${detail}` : ''}`)
  }
}

const test = ACHIEVEMENT_TEST_SEED[18] as AchievementTestDoc // 青い嵐
const flat = flattenQuestions(test)
check('問題は 5 カテゴリ × 5 問 = 25 問', flat.length === 25 && test.categories.length === 5)

// 全問「紋章らしい答え」→ 100 点、全問その反対 → 0 点
const best: TestAnswer[] = flat.map((q) => (q.question.scores[0] === 4 ? 'agree' : 'disagree'))
const worst: TestAnswer[] = flat.map((q) => (q.question.scores[0] === 4 ? 'disagree' : 'agree'))
check('全問正解で 100 点', scoreTest(test, best).total === 100)
check('全問不正解で 0 点', scoreTest(test, worst).total === 0)
check('カテゴリはそれぞれ 20 点満点', scoreTest(test, best).categories.every((c) => c.score === 20 && c.max === 20))

// 「どちらでもない」の減点: 4 つ → 0、5 つ → −5、7 つ → −7、25 つ → −25
for (const [n, expected] of [[0, 0], [1, 0], [4, 0], [5, -5], [7, -7], [25, -25]] as const) {
  const answers: TestAnswer[] = best.map((a, i) => (i < n ? 'neutral' : a))
  const s = scoreTest(test, answers)
  const raw = 100 - n * 2 // 4 点の答えを 2 点に置き換えたぶん
  check(`「どちらでもない」${n} つ → 減点 ${expected}、総合点 ${raw + expected}`,
    s.neutralCount === n && s.penalty === expected && s.rawTotal === raw && s.total === raw + expected,
    `neutralCount=${s.neutralCount} penalty=${s.penalty} rawTotal=${s.rawTotal} total=${s.total}`)
}
check(`減点が始まる個数は ${NEUTRAL_PENALTY_THRESHOLD}`, NEUTRAL_PENALTY_THRESHOLD === 5)

// 0 点の答え + 5 つ以上の「どちらでもない」でも 0 未満にならない
{
  const answers: TestAnswer[] = worst.map((a, i) => (i < 5 ? 'neutral' : a))
  const s = scoreTest(test, answers)
  check('合計 10 点 − 5 点 = 5 点(下限 0 の手前)', s.rawTotal === 10 && s.penalty === -5 && s.total === 5, JSON.stringify(s))
}
{
  // 全問 0 点は作れない(どちらでもないは 2 点)ので、下限は式で確認: max(0, raw + penalty)
  const answers: TestAnswer[] = flat.map(() => 'neutral')
  const s = scoreTest(test, answers)
  check('全問「どちらでもない」: 50 − 25 = 25 点', s.rawTotal === 50 && s.penalty === -25 && s.total === 25, JSON.stringify(s))
}

// 全 20 紋章のデータが採点できる(配点が [4,2,0] / [0,2,4] のどちらか)
check('全 20 紋章の配点が [4,2,0] か [0,2,4]',
  ACHIEVEMENT_TEST_SEED.every((t) => flattenQuestions(t as AchievementTestDoc).every((q) => {
    const s = q.question.scores.join(',')
    return s === '4,2,0' || s === '0,2,4'
  })))

console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`)
process.exit(failed === 0 ? 0 : 1)
