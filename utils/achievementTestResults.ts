import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Firestore,
  type Timestamp
} from 'firebase/firestore'
import {
  scoreTest,
  type AchievementTestDoc,
  type TestAnswer,
  type TestCategoryKey,
  type TestResultDoc,
  type TestScore
} from '~/utils/achievementTest'

// 到達度診断テストの問題の取得と、結果の読み書き。
// 問題: achievementTests/{sealIndex}(チーム会員と管理者だけ読める)。
// 結果: users/{uid}/testResults/{autoId} に1回ぶんずつ。本人が create できるのは firestore.rules で
// 「チーム所属かつ利用停止でない」ときだけ、update / delete は誰にもできない。読むのは本人と管理者。

export async function fetchAchievementTest(firestore: Firestore, sealIndex: number): Promise<AchievementTestDoc | null> {
  const snap = await getDoc(doc(firestore, 'achievementTests', String(sealIndex)))
  return snap.exists() ? (snap.data() as AchievementTestDoc) : null
}

export interface TestResultRow extends Omit<TestResultDoc, 'takenAt'> {
  id: string
  takenAt: Timestamp | null
}

export async function saveTestResult(firestore: Firestore, uid: string, test: AchievementTestDoc, answers: TestAnswer[]): Promise<TestScore> {
  const score = scoreTest(test, answers)
  const categoryScores = {} as Record<TestCategoryKey, number>
  for (const c of score.categories) categoryScores[c.key] = c.score
  const docData: TestResultDoc = {
    sealIndex: test.sealIndex,
    sealName: test.sealName,
    answers,
    categoryScores,
    neutralCount: score.neutralCount,
    penalty: score.penalty,
    total: score.total,
    takenAt: serverTimestamp()
  }
  await addDoc(collection(firestore, 'users', uid, 'testResults'), docData)
  return score
}

// 新しい順。単一フィールドの orderBy なので複合インデックスは要らない。
export async function fetchTestResults(firestore: Firestore, uid: string): Promise<TestResultRow[]> {
  const snap = await getDocs(query(collection(firestore, 'users', uid, 'testResults'), orderBy('takenAt', 'desc')))
  return snap.docs.map((d) => {
    const data = d.data() as TestResultDoc
    return { ...data, id: d.id, takenAt: (data.takenAt as Timestamp | undefined) ?? null }
  })
}

// チーム詳細のメンバー一覧に出す1行ぶんの要約。例: 「赤い竜 63点（2回・最新 2026-09-29）」。
export function formatResultSummaryLine(rows: TestResultRow[]): string {
  if (!rows.length) return '未受験'
  const latest = rows[0]
  return `${latest.sealName} ${latest.total}点（${rows.length}回・最新 ${formatTestDate(latest.takenAt)}）`
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function formatTestDate(ts: Timestamp | null): string {
  const d = ts?.toDate()
  if (!d) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatTestDateTime(ts: Timestamp | null): string {
  const d = ts?.toDate()
  if (!d) return '—'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
