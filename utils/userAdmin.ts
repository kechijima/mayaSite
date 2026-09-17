import { doc, updateDoc, type Firestore } from 'firebase/firestore'

// 会員ステータスの読み替えと変更。/admin/users から使う。
//
// ステータスは保存せず、users ドキュメントのフィールドから導出する(上から順に判定):
//   suspended: true  → 利用停止（有料エリアが閲覧できない）
//   plan: 'paid'     → 有料会員 — 決済導入後にサーバーが付与する
//   teamId != null   → チーム会員 — チームに所属している間だけ
//   それ以外          → 無料会員
//
// チーム会員は選択肢ではなく表示専用。所属の出し入れは /admin/teams で行い、
// チームから外せば自動的に無料会員に戻る(管理者が追加したメンバーも同じ扱い)。
// こちらで操作するのは利用停止の付け外しだけ、と役割を分けている。

export type UserStatus = 'suspended' | 'paid' | 'team' | 'free'

export interface UserStatusFields {
  plan?: string
  suspended?: boolean
  teamId?: string | null
}

export function userStatus(data: UserStatusFields): UserStatus {
  if (data.suspended === true) return 'suspended'
  if (data.plan === 'paid') return 'paid'
  if (data.teamId) return 'team'
  return 'free'
}

export const USER_STATUS_LABEL: Record<UserStatus, string> = {
  free: '無料会員',
  team: 'チーム会員',
  paid: '有料会員',
  suspended: '利用停止'
}

// 詳細画面で選べる選択肢。有料会員は決済機能の導入後に解禁する — 現時点では
// 無料会員との違いが無く、切り替えても何も起きないボタンになってしまうため
// (決済導入時に 'paid' をこの配列へ足すだけで選べるようになる)。
export const SELECTABLE_USER_STATUSES: UserStatus[] = ['free', 'suspended']

export const USER_STATUS_NOTE: Record<UserStatus, string> = {
  free: '有料エリアを閲覧できます。',
  team: 'チームに所属しているため、すべての診断結果を閲覧できます。無料会員に戻す場合はチーム管理からチームを外してください。',
  paid: '有料エリアを閲覧できます。決済済みの会員です。',
  suspended: '有料エリアを閲覧できません。無料の診断はこれまで通りご利用いただけます。本人が紹介コードを入力しても解除されません。'
}

// 利用停止は suspended、有料化は plan で表す。片方だけを書き換えると
// 「停止中の有料会員」のような読みにくい状態が残るので、常に両方を確定させる。
// 'team' はチーム所属から導出されるので、ここでは書き込まない(plan は 'free' になる)。
export async function setUserStatus(firestore: Firestore, uid: string, status: UserStatus) {
  await updateDoc(doc(firestore, 'users', uid), {
    suspended: status === 'suspended',
    plan: status === 'paid' ? 'paid' : 'free'
  })
}
