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

// /admin/teams の書き込み処理。チーム作成はドキュメント3件(referralTeams・
// referralCodes・publicTeams)の同時作成になるため、ページ側に散らさずここへまとめている。
//
// publicTeams は /signup/referral と /account のチーム選択プルダウン用の公開コピー
// ({ name, active, listed, code })。referralTeams は管理者メモを含むため公開できない。
// チームの作成・改名・コードの有効/無効切り替え・コードの再発行・選択肢への表示切り替えで必ず一緒に更新する
// (中身は publicTeamData() で組み立てる)。
//
// 2026-11-19 要望: 登録画面のチーム選択は「選択肢に出すチーム(吉田チームなど)」+「その他」にした。
// 選択肢に出すチーム(listed)は選ぶと紹介コードが自動で入る — そのため listed のチームに限り
// publicTeams にコードを置く(誰でも読める = そのチームには誰でも入れる。了承済み)。
// listed でないチームのコードは今までどおり公開しない(「その他」を選んで手入力する)。
// 既存チームぶんは scripts/backfillPublicTeams.ts で作る。
// 読み取り権限は firestore.rules で管理者に限定されているので、ここでの操作は
// すべて管理者セッションでのみ成功する。

export interface ReferralTeam {
  id: string
  name: string
  code: string
  note: string
  // 登録画面のチーム選択に出し、選んだらコードを自動入力する(無ければ false)
  listed?: boolean
  createdAt: Timestamp | null
}

// publicTeams/{teamId} の中身。コードは listed のときだけ載せる。
export function publicTeamData(team: Pick<ReferralTeam, 'name' | 'code' | 'listed'>, active: boolean) {
  const listed = team.listed === true
  return { name: team.name, active, listed, code: listed ? team.code : null }
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

  // 3件を1つのバッチで作る。一部だけ通ると「コードはあるがチームが無い」「チームはあるが
  // 誰も入会できない」「プルダウンに出ない」といった中途半端な状態が残るため。
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, 'referralTeams', teamId), {
    name,
    code,
    note: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  batch.set(doc(firestore, 'referralCodes', code), { teamId, teamName: name, status: 'active' })
  batch.set(doc(firestore, 'publicTeams', teamId), publicTeamData({ name, code, listed: false }, true))
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

// コードを無効にしたチームは、登録ページのプルダウンからも外す(publicTeams.active)。
// publicTeams は update でなく merge 付き set — 移行前のチームにはまだ存在しないことがあるため。
export async function setCodeStatus(
  firestore: Firestore,
  team: Pick<ReferralTeam, 'id' | 'name' | 'code' | 'listed'>,
  status: 'active' | 'disabled'
) {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'referralCodes', team.code), { status })
  batch.set(doc(firestore, 'publicTeams', team.id), publicTeamData(team, status === 'active'), { merge: true })
  await batch.commit()
}

// 紹介コードの再発行(2026-11-19 要望: コードを変えたい)。新しいランダムなコードを作り、古いコードは
// 無効にする(古いコードで新しく登録はできない。既にいるメンバーの所属はそのまま)。
// 古いコードの文書は消さずに disabled で残す — メンバーの referralCodeId が「どのコードで入ったか」の履歴として指すため。
// 新しいコードの有効/無効は古いコードの状態を引き継ぐ。
export async function reissueCode(firestore: Firestore, team: ReferralTeam): Promise<string> {
  const old = await fetchCodeStatus(firestore, team.code)
  const status = old?.status ?? 'active'
  const code = await pickUnused(firestore, 'referralCodes', () => generateCode(team.id))
  const batch = writeBatch(firestore)
  batch.set(doc(firestore, 'referralCodes', code), { teamId: team.id, teamName: team.name, status })
  if (old) batch.update(doc(firestore, 'referralCodes', team.code), { status: 'disabled' })
  batch.update(doc(firestore, 'referralTeams', team.id), { code, updatedAt: serverTimestamp() })
  batch.set(doc(firestore, 'publicTeams', team.id), publicTeamData({ ...team, code }, status === 'active'), { merge: true })
  await batch.commit()
  return code
}

// 登録画面のチーム選択に出すか(出すと、選んだときにコードが自動で入る)。
export async function setListed(firestore: Firestore, team: ReferralTeam, listed: boolean) {
  const code = await fetchCodeStatus(firestore, team.code)
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'referralTeams', team.id), { listed, updatedAt: serverTimestamp() })
  batch.set(doc(firestore, 'publicTeams', team.id), publicTeamData({ ...team, listed }, code?.status === 'active'), { merge: true })
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
// チームに所属している間はチーム会員として扱われる(utils/userAdmin.ts の userStatus)。
// 管理者が追加したメンバーも同じ扱い。
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

// チームから外す。外すとチーム会員ではなくなり、無料会員に戻る
// (利用停止にしたい場合は /admin/users で「利用停止」にする)。
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

// チーム名の変更。表示名は referralTeams・referralCodes・publicTeams・各メンバーの users に
// 非正規化されているため、すべてを揃える。放置すると登録ページのプルダウンや確認表示、
// /account の所属表示に古い名前が残る。
export async function renameTeam(firestore: Firestore, team: ReferralTeam, name: string) {
  const [members, code] = await Promise.all([fetchMembers(firestore, team.id), fetchCodeStatus(firestore, team.code)])
  const writes: { ref: ReturnType<typeof doc>; data: Record<string, unknown>; merge?: boolean }[] = [
    { ref: doc(firestore, 'referralTeams', team.id), data: { name, updatedAt: serverTimestamp() } },
    { ref: doc(firestore, 'referralCodes', team.code), data: { teamName: name } },
    // 移行前のチームには publicTeams がまだ無いことがあるので merge 付き set。
    { ref: doc(firestore, 'publicTeams', team.id), data: publicTeamData({ ...team, name }, code?.status === 'active'), merge: true },
    ...members.map((m) => ({ ref: doc(firestore, 'users', m.uid), data: { teamName: name } }))
  ]
  // Firestoreのバッチ上限は500件。メンバー数によっては超えるので分割する。
  for (let start = 0; start < writes.length; start += 400) {
    const batch = writeBatch(firestore)
    for (const w of writes.slice(start, start + 400)) {
      if (w.merge) batch.set(w.ref, w.data, { merge: true })
      else batch.update(w.ref, w.data)
    }
    await batch.commit()
  }
}

export async function updateNote(firestore: Firestore, teamId: string, note: string) {
  const batch = writeBatch(firestore)
  batch.update(doc(firestore, 'referralTeams', teamId), { note, updatedAt: serverTimestamp() })
  await batch.commit()
}
