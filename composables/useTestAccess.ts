// 到達度診断テスト(/test, /test/take)を受けられるかの出し分け。firestore.rules の
// users/{uid}/testResults の create 条件(チーム所属かつ利用停止でない)と対。
// 判定そのものは useEntitlement() の profile から導き、ここでは画面の状態名に読み替えるだけ。
//
//   loading   … 認証の復元か users ドキュメントの取得が終わっていない
//   signedOut … 未ログイン。通常は middleware/member-auth.ts が先にログイン画面へ送るので、
//               ここに来るのは表示中にログアウトされたときだけ(ログイン導線を出す)
//   noProfile … ログイン済みだが users ドキュメントが無い(管理者用アカウントなど会員登録を経ていない
//               アカウント)。以前は loading 扱いで、画面が覆われたまま進めなかった(2026-10-05)
//   suspended … 利用停止中
//   notTeam   … ログイン済みだがチーム会員でも有料会員でもない(紹介コードの登録かプランの購入を案内)
//   ok        … チーム会員または有料会員。受験できる(有料会員は 2026-09-30 に追加)
export type TestAccess = 'loading' | 'signedOut' | 'noProfile' | 'suspended' | 'notTeam' | 'ok'

export function useTestAccess() {
  const route = useRoute()
  const { user, ready } = useAuth()
  const { profile, settled, suspended, entitled } = useEntitlement()

  const access = computed<TestAccess>(() => {
    if (!ready.value) return 'loading'
    if (!user.value) return 'signedOut'
    if (!settled.value) return 'loading'
    if (!profile.value) return 'noProfile'
    if (suspended.value) return 'suspended'
    // entitled = 停止でなく、有料会員かチーム所属(composables/useEntitlement.ts)
    if (!entitled.value) return 'notTeam'
    return 'ok'
  })

  // 判定が固まるまで(認証の復元・会員情報の取得)は画面を覆う。TestAccessNotice はその間なにも出さない。
  useLoadingWhile('test-access', () => access.value === 'loading')

  const loginLink = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
  const accountLink = computed(() => `/account?redirect=${encodeURIComponent(route.fullPath)}`)
  return { access, user, profile, loginLink, accountLink }
}
