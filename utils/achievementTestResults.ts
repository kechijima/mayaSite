import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Firestore,
  type Timestamp
} from 'firebase/firestore'
import {
  TEST_LEVELS,
  TEST_LEVEL_LABEL,
  isPassing,
  scoreAnswers,
  type AnsweredQuestion,
  type TestLevel,
  type TestResultDoc
} from '~/utils/achievementTest'

// 到達度テストの結果の読み書き。users/{uid}/testResults/{autoId} に1回ぶんずつ置く。
// 本人が create できるのは firestore.rules で「チーム所属かつ利用停止でない」ときだけ、
// update / delete は誰にもできない(受けた記録は改変しない)。読むのは本人と管理者。
// 級ごとの合否や回数は保存せず、履歴から導く(会員ステータスと同じ「導出して保存しない」方針)。

export interface TestResultRow extends Omit<TestResultDoc, 'takenAt'> {
  id: string
  takenAt: Timestamp | null
}

export async function saveTestResult(firestore: Firestore, uid: string, level: TestLevel, answers: AnsweredQuestion[]) {
  const score = scoreAnswers(answers)
  const total = answers.length
  const docData: TestResultDoc = {
    level,
    score,
    total,
    passed: isPassing(score, total),
    answers,
    takenAt: serverTimestamp()
  }
  await addDoc(collection(firestore, 'users', uid, 'testResults'), docData)
}

// 新しい順。単一フィールドの orderBy なので複合インデックスは要らない。
export async function fetchTestResults(firestore: Firestore, uid: string): Promise<TestResultRow[]> {
  const snap = await getDocs(query(collection(firestore, 'users', uid, 'testResults'), orderBy('takenAt', 'desc')))
  return snap.docs.map((d) => {
    const data = d.data() as TestResultDoc
    return { ...data, id: d.id, takenAt: (data.takenAt as Timestamp | undefined) ?? null }
  })
}

// 級ごとのまとめ(受けた回数・最高点・合格したことがあるか・最後に受けた日時)。
export interface LevelSummary {
  level: TestLevel
  attempts: number
  best: number | null
  total: number | null
  passed: boolean
  lastAt: Timestamp | null
}

export function summarizeByLevel(rows: TestResultRow[]): Record<TestLevel, LevelSummary> {
  const out = {} as Record<TestLevel, LevelSummary>
  for (const level of TEST_LEVELS) {
    out[level] = { level, attempts: 0, best: null, total: null, passed: false, lastAt: null }
  }
  for (const r of rows) {
    const s = out[r.level]
    if (!s) continue
    s.attempts++
    if (s.best === null || r.score > s.best) {
      s.best = r.score
      s.total = r.total
    }
    if (r.passed) s.passed = true
    if (r.takenAt && (!s.lastAt || r.takenAt.toMillis() > s.lastAt.toMillis())) s.lastAt = r.takenAt
  }
  return out
}

// チーム詳細のメンバー一覧に出す1行ぶんの要約。例: 「初級 合格 ／ 中級 未合格 ／ 上級 —」。
// 1回も受けていなければ「未受験」。
export function formatLevelSummaryLine(summary: Record<TestLevel, LevelSummary>): string {
  if (TEST_LEVELS.every((l) => summary[l].attempts === 0)) return '未受験'
  return TEST_LEVELS
    .map((l) => {
      const s = summary[l]
      const state = s.attempts === 0 ? '—' : s.passed ? '合格' : '未合格'
      return `${TEST_LEVEL_LABEL[l]} ${state}`
    })
    .join(' ／ ')
}

export function formatTestDateTime(ts: Timestamp | null): string {
  const d = ts?.toDate()
  if (!d) return '—'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
