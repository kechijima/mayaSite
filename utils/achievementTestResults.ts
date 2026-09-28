import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  type DocumentData,
  type Firestore,
  type QueryDocumentSnapshot,
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
// 2026-09-29 より前の1日だけ動いていた「知識を問う4択」の結果(level を持ち sealIndex が無い)は
// 本番から消した(同日)。形の違うドキュメントが混ざっても落ちないよう、念のため読み飛ばしは残す。
export async function fetchTestResults(firestore: Firestore, uid: string): Promise<TestResultRow[]> {
  const snap = await getDocs(query(collection(firestore, 'users', uid, 'testResults'), orderBy('takenAt', 'desc')))
  return snap.docs
    .filter((d) => typeof d.data().sealIndex === 'number')
    .map((d) => {
      const data = d.data() as TestResultDoc
      return { ...data, id: d.id, takenAt: (data.takenAt as Timestamp | undefined) ?? null }
    })
}

// ---- 管理画面 /admin/test-history: 全会員の受験履歴を横断して新しい順に ----
// collectionGroup('testResults') は firestore.rules の /{path=**}/testResults(管理者のみ)と、
// firestore.indexes.json の takenAt の COLLECTION_GROUP インデックスが要る。
// 本番でインデックスがまだ作られていないと failed-precondition で落ちる — 呼び出し側で案内する。
export interface TestResultLogRow extends TestResultRow {
  uid: string
}

export async function fetchTestResultsPage(
  firestore: Firestore,
  pageSize: number,
  cursor: QueryDocumentSnapshot<DocumentData> | null
): Promise<{ rows: TestResultLogRow[]; hasNext: boolean; nextCursor: QueryDocumentSnapshot<DocumentData> | null }> {
  const constraints = [orderBy('takenAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(pageSize + 1)]
  const snap = await getDocs(query(collectionGroup(firestore, 'testResults'), ...constraints))
  const docs = snap.docs.filter((d) => typeof d.data().sealIndex === 'number')
  const hasNext = snap.docs.length > pageSize
  const pageDocs = docs.slice(0, pageSize)
  const rows = pageDocs.map((d) => {
    const data = d.data() as TestResultDoc
    return { ...data, id: d.id, uid: d.ref.parent.parent?.id ?? '', takenAt: (data.takenAt as Timestamp | undefined) ?? null }
  })
  const lastRaw = snap.docs.slice(0, pageSize).at(-1) ?? null
  return { rows, hasNext, nextCursor: lastRaw }
}

// 履歴の行に出す会員の名前・メール・チーム。結果には保存していないので users から引く(1人1回)。
export interface TestResultUserInfo {
  name: string
  email: string
  teamName: string
}
export async function fetchTestResultUsers(firestore: Firestore, uids: string[]): Promise<Record<string, TestResultUserInfo>> {
  const out: Record<string, TestResultUserInfo> = {}
  await Promise.all(
    [...new Set(uids)].map(async (uid) => {
      try {
        const snap = await getDoc(doc(firestore, 'users', uid))
        const d = (snap.data() ?? {}) as { name?: string; email?: string; teamName?: string | null; teamId?: string | null }
        out[uid] = { name: d.name ?? '', email: d.email ?? '', teamName: d.teamId ? (d.teamName || d.teamId) : '' }
      } catch {
        out[uid] = { name: '', email: '', teamName: '' }
      }
    })
  )
  return out
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
