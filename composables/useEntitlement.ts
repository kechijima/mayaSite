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
  teamId: string | null
  // 所属チーム名。referralTeams は管理者専用で、管理者に追加されたメンバーはコードも
  // 知らないため、非正規化しないと本人が自分の所属チーム名に到達できない(/accountの表示用)。
  teamName: string | null
  entitlement: 'none' | 'code'
  entitlementSource: 'code' | 'admin' | null
  referralCodeId: string | null
  // 初回所属日時。チームから外れても消さないので、「一度でも所属したことがあるか」の
  // 判定に使える — /account が「未所属」と「除外済み」を出し分けるのはこの値。
  referralRedeemedAt: unknown | null
  plan: 'free' | 'paid'
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
    // 決済導入時はここを profile.value?.plan === 'paid' に置き換える(仕様書10章)。
    // 未確定(settled === false)の間は false を返すので、判定が固まる前に有料本文が
    // 一瞬見えてしまうことはない。
    entitled: computed(() => profile.value?.entitlement === 'code'),
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
