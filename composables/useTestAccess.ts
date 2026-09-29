// 到達度診断テスト(/test, /test/take)を受けられるかの出し分け。firestore.rules の
// users/{uid}/testResults の create 条件(チーム所属かつ利用停止でない)と対。
// 判定そのものは useEntitlement() の profile から導き、ここでは画面の状態名に読み替えるだけ。
//
//   loading   … 認証の復元か users ドキュメントの取得が終わっていない
//   signedOut … 未ログイン(ログイン導線を出す。戻り先は今のページ)
//   suspended … 利用停止中
//   notTeam   … ログイン済みだがチームに所属していない(紹介コードの登録を案内)
//   ok        … チーム会員。受験できる
export type TestAccess = 'loading' | 'signedOut' | 'suspended' | 'notTeam' | 'ok'

export function useTestAccess() {
  const route = useRoute()
  const { user, ready } = useAuth()
  const { profile, settled, suspended, teamId } = useEntitlement()

  const access = computed<TestAccess>(() => {
    if (!ready.value) return 'loading'
    if (!user.value) return 'signedOut'
    if (!settled.value || !profile.value) return 'loading'
    if (suspended.value) return 'suspended'
    if (!teamId.value) return 'notTeam'
    return 'ok'
  })

  // 判定が固まるまで(認証の復元・会員情報の取得)は画面を覆う。TestAccessNotice はその間なにも出さない。
  useLoadingWhile('test-access', () => access.value === 'loading')

  const loginLink = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
  const accountLink = computed(() => `/account?redirect=${encodeURIComponent(route.fullPath)}`)

  return { access, user, profile, loginLink, accountLink }
}
