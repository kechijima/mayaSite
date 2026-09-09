import { doc, getDoc, type Firestore } from 'firebase/firestore'

// 有料エリアの閲覧可否。pages/result.vue・pages/kin/[sealIndex].vue・
// pages/kin/[kin]/detail.vue の3ページが個別に持っていた
// `ready && !!user`(ログインすれば全員閲覧可)を、ここ1箇所に集約したもの。
//
// 集約しているのは、将来決済を導入したときに「チーム所属者」から「決済した人」へ
// 切り替える変更を1行で済ませるため。entitled の中身と firestore.rules の
// isEntitled() を対で書き換えるだけで切り替わる(仕様書10章)。
//
// 判定にはFirestoreの users/{uid} を1件読む必要があるため、useAuth() の ready
// (Firebase Authの初期セッション復元が終わったか)だけでは足りない。settled が
// 両方の完了を表す — 詳細は下記。

export interface EntitlementProfile {
  // 診断フォームの入力内容。コード登録後に本人の診断結果ページへ戻すために使う
  // (pages/account.vue) — LockedVeil経由でない場合、戻り先のクエリが他に無いため。
  name?: string
  birthdate?: string
  gender?: string
  // 所属チーム。2026-09-09以降、これは「誰の紹介で入会したか」の記録であって
  // 閲覧可否には影響しない。
  teamId: string | null
  // 所属チーム名。referralTeams は管理者専用で、管理者に追加されたメンバーはコードも
  // 知らないため、非正規化しないと本人が自分の所属チーム名に到達できない(/accountの表示用)。
  teamName: string | null
  entitlementSource: 'code' | 'admin' | null
  referralCodeId: string | null
  // 最後にチームへ所属した日時。外れても消さないので「一度でも所属したことがあるか」が
  // 分かる — /account が案内文を「登録」と「再登録」で出し分けるのに使っている
  // (閲覧できるかどうかの判定には使わない。それは entitlement / teamId 側)。
  referralRedeemedAt: unknown | null
  // 会員ステータスの正。決済導入までは全員 'free' のまま(有料会員は存在しない)。
  plan: 'free' | 'paid'
  // 利用停止。true の間だけ有料エリアが閲覧できなくなる。無料部分は使える。
  // 変更できるのは管理者のみで、本人は解除できない(firestore.rules)。
  suspended?: boolean
}

export function useEntitlement() {
  const { user, ready } = useAuth()
  const { $firestore } = useNuxtApp()

  const { data: profile, pending, refresh } = useAsyncData(
    'entitlement',
    async () => {
      if (!user.value) return null
      const snap = await getDoc(doc($firestore as Firestore, 'users', user.value.uid))
      return snap.exists() ? (snap.data() as EntitlementProfile) : null
    },
    { server: false, lazy: true, watch: [user] }
  )

  return {
    // 現在の条件は「会員登録していて、利用停止されていないこと」。決済導入時は
    // `&& profile.value?.plan === 'paid'` を足し、firestore.rules の isEntitled() と
    // 対で切り替える(仕様書10章)。
    // 未確定(settled === false)の間は profile が null なので false を返す。判定が
    // 固まる前に有料本文が一瞬見えてしまうことはない。
    entitled: computed(() => !!profile.value && profile.value.suspended !== true),
    // 利用停止中かどうか。/account が「ご利用いただけません」を出し分けるのに使う。
    suspended: computed(() => profile.value?.suspended === true),
    // 認証の復元とusersドキュメントの取得が両方終わったか。呼び出し側はこれが
    // true になるまで「解放」も「ロック」も出さない — ready(認証のみ)で判断すると、
    // 所属済みの会員にも profile 取得中の一瞬だけ有料エリアの訴求が出てしまうため。
    settled: computed(() => ready.value && !pending.value),
    teamId: computed(() => profile.value?.teamId ?? null),
    profile,
    // /account でコードを登録した直後に、再読み込みなしで解放を反映させるために使う。
    refresh
  }
}
