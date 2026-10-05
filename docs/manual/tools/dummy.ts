import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { diagnoseBirthdate, kinInfo, relationSealIndices, destinyKins } from '../../../utils/mayaCalc'
import { SEALS, TONES } from '../../../utils/mayaData'
import { scoreTest, flattenQuestions } from '../../../utils/achievementTest'

initializeApp({ projectId: 'mayachannel-34fd5' })
const auth = getAuth()
const db = getFirestore()
const ts = (s: string) => Timestamp.fromDate(new Date(s))

const teams = [
  { id: 'KYT', name: '京都マヤ暦研究会', code: 'KYT7M3QP9', note: '2026年秋期の受講生', status: 'active', at: '2026-08-20T10:00:00+09:00' },
  { id: 'NRA', name: '奈良サロン', code: 'NRA4R8WXH', note: '', status: 'active', at: '2026-09-05T14:00:00+09:00' },
  { id: 'SGA', name: '滋賀勉強会（2025年度）', code: 'SGAH6T2VC', note: '募集終了', status: 'disabled', at: '2026-07-10T09:00:00+09:00' }
]
for (const t of teams) {
  await db.doc(`referralTeams/${t.id}`).set({ name: t.name, code: t.code, note: t.note, createdAt: ts(t.at), updatedAt: ts(t.at) })
  await db.doc(`referralCodes/${t.code}`).set({ teamId: t.id, teamName: t.name, status: t.status })
  await db.doc(`publicTeams/${t.id}`).set({ name: t.name, active: t.status === 'active' })
}

type U = { name: string; email: string; phone: string; birth: string; gender: 'male' | 'female'; at: string; team?: string; via?: 'code' | 'admin'; plan?: 'paid'; suspended?: boolean; buyOwn?: boolean; tests?: { at: string; pattern: number }[] }
const users: U[] = [
  { name: '山田 花子', email: 'hanako@example.com', phone: '090-0000-0001', birth: '1990-04-15', gender: 'female', at: '2026-08-25T19:12:00+09:00', team: 'KYT', via: 'code', tests: [{ at: '2026-09-10T20:30:00+09:00', pattern: 1 }, { at: '2026-09-30T21:05:00+09:00', pattern: 2 }] },
  { name: '佐藤 健', email: 'ken@example.com', phone: '090-0000-0002', birth: '1985-11-03', gender: 'male', at: '2026-08-28T08:40:00+09:00', team: 'KYT', via: 'admin', tests: [{ at: '2026-09-28T12:15:00+09:00', pattern: 3 }] },
  { name: '中村 愛', email: 'ai@example.com', phone: '090-0000-0003', birth: '1996-02-11', gender: 'female', at: '2026-09-02T22:01:00+09:00', team: 'KYT', via: 'code' },
  { name: '鈴木 美咲', email: 'misaki@example.com', phone: '090-0000-0004', birth: '1992-07-21', gender: 'female', at: '2026-09-08T13:25:00+09:00', team: 'NRA', via: 'code', tests: [{ at: '2026-10-01T09:45:00+09:00', pattern: 2 }] },
  { name: '田中 一郎', email: 'ichiro@example.com', phone: '090-0000-0005', birth: '1978-01-30', gender: 'male', at: '2026-09-12T17:50:00+09:00', plan: 'paid', tests: [{ at: '2026-10-02T18:20:00+09:00', pattern: 1 }] },
  { name: '高橋 由美', email: 'yumi@example.com', phone: '090-0000-0006', birth: '1988-09-09', gender: 'female', at: '2026-09-15T11:05:00+09:00', buyOwn: true },
  { name: '伊藤 直樹', email: 'naoki@example.com', phone: '090-0000-0007', birth: '1995-12-25', gender: 'male', at: '2026-09-20T23:30:00+09:00' },
  { name: '小林 誠', email: 'makoto@example.com', phone: '090-0000-0008', birth: '1982-06-18', gender: 'male', at: '2026-09-24T07:15:00+09:00' },
  { name: '渡辺 さくら', email: 'sakura@example.com', phone: '090-0000-0009', birth: '2000-03-03', gender: 'female', at: '2026-09-27T15:45:00+09:00', suspended: true },
  { name: '加藤 翔', email: 'sho@example.com', phone: '090-0000-0010', birth: '1999-10-08', gender: 'male', at: '2026-10-01T20:10:00+09:00' }
]
const PATTERNS: Record<number, string> = { 1: 'aadanaadaadaanadaaadaadan', 2: 'aadaaaadaadaaaadaaadaadaa', 3: 'andnanadnaandnaadnanadand' }
for (const u of users) {
  let uid: string
  try { uid = (await auth.getUserByEmail(u.email)).uid; await auth.updateUser(uid, { password: 'password123', displayName: u.name }) }
  catch { uid = (await auth.createUser({ email: u.email, password: 'password123', displayName: u.name })).uid }
  const team = teams.find((t) => t.id === u.team)
  await db.doc(`users/${uid}`).set({
    name: u.name, phone: u.phone, email: u.email, birthdate: u.birth, gender: u.gender,
    plan: u.plan ?? 'free', suspended: u.suspended ?? false, createdAt: ts(u.at),
    ...(u.plan ? { paidAt: ts(u.at), paidSource: 'mock' } : {}),
    teamId: team?.id ?? null, teamName: team?.name ?? null, entitlementSource: team ? u.via : null,
    referralCodeId: team && u.via === 'code' ? team.code : null, referralRedeemedAt: team ? ts(u.at) : null
  })
  const { birth } = diagnoseBirthdate(u.birth)
  if (u.buyOwn) {
    const kin = birth.kin
    const info = kinInfo(kin)
    const ids = new Set<string>([`kin-${kin}`, `character-${info.sealIndex}`, `character-${info.wavespellSealIndex}`])
    for (const s of relationSealIndices(kin)) ids.add(`character-${s}`)
    for (const k of destinyKins(kin)) ids.add(`kin-${k}`)
    await db.doc(`users/${uid}/purchases/kin-${kin}`).set({ kin, price: 550, unlocks: [...ids], source: 'mock', createdAt: ts('2026-09-16T10:00:00+09:00') })
    for (const id of ids) await db.doc(`users/${uid}/unlocks/${id}`).set({ kin, source: 'mock', purchasedAt: ts('2026-09-16T10:00:00+09:00') })
  }
  for (const t of u.tests ?? []) {
    const test = (await db.doc(`achievementTests/${birth.sealIndex}`).get()).data() as any
    const flat = flattenQuestions(test)
    const p = PATTERNS[t.pattern]
    // a=紋章らしい答え(4点), d=逆(0点), n=どちらでもない
    const answers = flat.map(({ question }, i) => p[i] === 'n' ? 'neutral' : (p[i] === 'a') === (question.scores[0] === 4) ? 'agree' : 'disagree') as any[]
    const score = scoreTest(test, answers)
    const categoryScores: Record<string, number> = {}
    for (const c of score.categories) categoryScores[c.key] = c.score
    await db.collection(`users/${uid}/testResults`).add({ sealIndex: test.sealIndex, sealName: test.sealName, answers, categoryScores, neutralCount: score.neutralCount, penalty: score.penalty, total: score.total, takenAt: ts(t.at) })
  }
  console.log(u.name, uid, 'KIN', birth.kin, SEALS[birth.sealIndex].name)
}

const person = (name: string, birthdate: string, gender: string) => {
  const { birth } = diagnoseBirthdate(birthdate)
  return { name, birthdate, gender, kin: birth.kin, sealIndex: birth.sealIndex, sealName: SEALS[birth.sealIndex].name, toneIndex: birth.toneIndex, toneName: TONES[birth.toneIndex].name, wavespellSealIndex: birth.wavespellSealIndex, wavespellSealName: SEALS[birth.wavespellSealIndex].name }
}
const singles: [string, string, string, string][] = [
  ['山田 花子', '1990-04-15', 'female', '2026-10-03T21:14:00+09:00'], ['ゲスト', '1987-05-05', 'male', '2026-10-03T18:02:00+09:00'],
  ['伊藤 直樹', '1995-12-25', 'male', '2026-10-02T23:31:00+09:00'], ['みほ', '1993-08-17', 'female', '2026-10-02T12:40:00+09:00'],
  ['田中 一郎', '1978-01-30', 'male', '2026-10-01T17:55:00+09:00'], ['ゲスト', '2001-02-14', 'female', '2026-10-01T09:20:00+09:00'],
  ['高橋 由美', '1988-09-09', 'female', '2026-09-30T11:08:00+09:00'], ['たかし', '1975-03-22', 'male', '2026-09-29T20:47:00+09:00'],
  ['鈴木 美咲', '1992-07-21', 'female', '2026-09-28T13:30:00+09:00'], ['ゲスト', '1969-11-11', 'female', '2026-09-27T08:05:00+09:00']
]
for (const [n, b, g, at] of singles) await db.collection('diagnosisHistory').add({ type: 'single', createdAt: ts(at), person: person(n, b, g) })
await db.collection('diagnosisHistory').add({ type: 'compatibility', createdAt: ts('2026-10-03T19:30:00+09:00'), self: person('山田 花子', '1990-04-15', 'female'), others: [person('夫', '1988-12-01', 'male'), person('母', '1962-06-06', 'female')] })
await db.collection('diagnosisHistory').add({ type: 'compatibility', createdAt: ts('2026-09-30T22:10:00+09:00'), self: person('小林 誠', '1982-06-18', 'male'), others: [person('同僚Aさん', '1984-04-04', 'male')] })
console.log('done')
