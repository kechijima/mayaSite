import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch,
  type Firestore,
  type Timestamp
} from 'firebase/firestore'
import { generateCode, generateTeamId } from '~/utils/referralCode'

// /admin/teams の書き込み処理。チーム作成はドキュメント2件(referralTeams と
// referralCodes)の同時作成になるため、ページ側に散らさずここへまとめている。
// 読み取り権限は firestore.rules で管理者に限定されているので、ここでの操作は
// すべて管理者セッションでのみ成功する。

export interface ReferralTeam {
  id: string
  name: string
  code: string
  note: string
  createdAt: Timestamp | null
}

export interface ReferralCodeDoc {
  teamId: string
  teamName: string
  status: 'active' | 'disabled'
}

export interface TeamMember {
  uid: string
  name: string
  email: string
  entitlementSource: 'code' | 'admin' | null
  joinedAt: Timestamp | null
}

// 一覧に出すメンバー数の上限。where('teamId','==',x) は単一フィールドなので
// Firestoreの自動インデックスだけで動くが、orderBy を足すと複合インデックスの
// 作成が必要になる。運用開始時の手間を増やさないため、並べ替えはクライアント側で
// 行い、クエリ自体は素のまま保っている。
export const MEMBER_LIST_LIMIT = 500

// チームIDとコードのランダム部が既存と衝突しないことを確認してから確定する。
// 31^3(チームID)・31^6(コード)なので実際に当たることはまずないが、当たった場合に
// 既存チームのコードを上書きしてしまうため、確認は省略しない。
async function pickUnused(firestore: Firestore, path: string, generate: () => string): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generate()
    if (!(await getDoc(doc(firestore, path, candidate))).exists()) return candidate
  }
  throw new Error(`${path} の未使用IDを生成できませんでした`)
}

export async function createTeam(firestore: Firestore, name: string): Promise<{ teamId: string; code: string }> {
  const teamId = await pickUnused(firestore, 'referralTeams', generateTeamId)
  const code = await pickUnused(firestore, 'referralCodes', () => generateCode(teamId))

  // 2件を1つのバッチで作る。片方だけ通ると「コードはあるがチームが無い」または
  // 「チームはあるが誰も入会できない」という中途半端な状態が残るため。
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, 'referralTeams', teamId), {
    name,
    code,
    note: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  batch.set(doc(firestore, 'referralCodes', code), { teamId, teamName: name, status: 'active' })
  await batch.commit()
  return { teamId, code }
}

export async function fetchTeams(firestore: Firestore): Promise<ReferralTeam[]> {
  const snap = await getDocs(collection(firestore, 'referralTeams'))
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<ReferralTeam, 'id'>) }))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
}

export async function fetchCodeStatus(firestore: Firestore, code: string): Promise<ReferralCodeDoc | null> {
  const snap = await getDoc(doc(firestore, 'referralCodes', code))
  return snap.exists() ? (snap.data() as ReferralCodeDoc) : null
}

export async function setCodeStatus(firestore: Firestore, code: string, status: 'active' | 'disabled') {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'referralCodes', code), { status })
  await batch.commit()
}

export async function countMembers(firestore: Firestore, teamId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(firestore, 'users'), where('teamId', '==', teamId))
  )
  return snap.data().count
}

export async function fetchMembers(firestore: Firestore, teamId: string): Promise<TeamMember[]> {
  const snap = await getDocs(
    query(collection(firestore, 'users'), where('teamId', '==', teamId), limit(MEMBER_LIST_LIMIT))
  )
  return snap.docs
    .map((d) => {
      const data = d.data() as { name?: string; email?: string; entitlementSource?: TeamMember['entitlementSource']; referralRedeemedAt?: Timestamp }
      return {
        uid: d.id,
        name: data.name ?? '',
        email: data.email ?? '',
        entitlementSource: data.entitlementSource ?? null,
        joinedAt: data.referralRedeemedAt ?? null
      }
    })
    .sort((a, b) => (b.joinedAt?.toMillis() ?? 0) - (a.joinedAt?.toMillis() ?? 0))
}

// メールアドレスでの会員検索。完全一致のみ — Firestoreは部分一致検索ができないため。
export async function findUserByEmail(firestore: Firestore, email: string) {
  const snap = await getDocs(
    query(collection(firestore, 'users'), where('email', '==', email.trim()), limit(1))
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  const data = d.data() as { name?: string; email?: string; teamId?: string | null; teamName?: string | null }
  return { uid: d.id, name: data.name ?? '', email: data.email ?? '', teamId: data.teamId ?? null, teamName: data.teamName ?? null }
}

// 管理者によるチームへの追加。entitlementSource を 'admin' にすることで、コードを
// 自分で入力した会員と区別する(この経路では referralCodeId は付けない — 管理者追加の
// メンバーにコードを知らせないため)。referralRedeemedAt は「一度でも所属したか」の記録。
//
// 2026-09-09: チームの出し入れは「誰の紹介で入会したか」の付け替えであって、
// 有料エリアの閲覧可否には影響しない。閲覧可否は plan/suspended 側で決まり、
// /admin/users から操作する(utils/userAdmin.ts)。
export async function addMember(firestore: Firestore, uid: string, teamId: string, teamName: string) {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'users', uid), {
    teamId,
    teamName,
    entitlementSource: 'admin',
    referralRedeemedAt: serverTimestamp()
  })
  await batch.commit()
}

// チームから外す。所属の解除だけで、有料エリアの閲覧可否は変わらない
// (閲覧を止めたい場合は /admin/users で「利用停止」にする)。
// referralCodeId と referralRedeemedAt は「いつ・どのコードで所属したことがあるか」の
// 履歴として残す。外された本人は、コードを知っていれば入力し直して再び所属できる。
export async function removeMember(firestore: Firestore, uid: string) {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'users', uid), {
    teamId: null,
    teamName: null,
    entitlementSource: null
  })
  await batch.commit()
}

// チーム名の変更。表示名は referralTeams・referralCodes・各メンバーの users に
// 非正規化されているため、3か所すべてを揃える。放置すると /signup の確認表示や
// /account の所属表示に古い名前が残る。
export async function renameTeam(firestore: Firestore, team: ReferralTeam, name: string) {
  const members = await fetchMembers(firestore, team.id)
  const writes: { ref: ReturnType<typeof doc>; data: Record<string, unknown> }[] = [
    { ref: doc(firestore, 'referralTeams', team.id), data: { name, updatedAt: serverTimestamp() } },
    { ref: doc(firestore, 'referralCodes', team.code), data: { teamName: name } },
    ...members.map((m) => ({ ref: doc(firestore, 'users', m.uid), data: { teamName: name } }))
  ]
  // Firestoreのバッチ上限は500件。メンバー数によっては超えるので分割する。
  for (let start = 0; start < writes.length; start += 400) {
    const batch = writeBatch(firestore)
    for (const w of writes.slice(start, start + 400)) batch.update(w.ref, w.data)
    await batch.commit()
  }
}

export async function updateNote(firestore: Firestore, teamId: string, note: string) {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'referralTeams', teamId), { note, updatedAt: serverTimestamp() })
  await batch.commit()
}
