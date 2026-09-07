import { buildSignupLink } from '~/utils/signupLink'

// LockedVeil(有料エリア)の「続きを購入する」の遷移先。
//
// 未ログイン … /signup。会員登録フォームに紹介コード欄があるので、登録と解放が一度で済む。
// ログイン済み … /account。紹介コードの後追い入力欄はこちらにある。
//
// ログイン済みの人を /signup へ送ってはいけない。pages/signup.vue は「既にログイン
// 済みならフォームを出さず遷移先へ流す」作りなので、押しても元のページへ即座に戻る
// だけの行き止まりになる(2026-09-07 まで実際にそうなっていた)。
//
// どちらの場合も redirect で元のページへ戻す。コードを登録したらそのまま続きが
// 読める状態に戻るのが自然なため。
export function useUnlockLink() {
  const route = useRoute()
  const { user, ready } = useAuth()

  return computed(() => {
    if (ready.value && user.value) return `/account?redirect=${encodeURIComponent(route.fullPath)}`
    // 診断フォームで入力済みのname/birth/genderも会員登録フォームへ引き継ぐ。
    return buildSignupLink(route.fullPath, route.query)
  })
}
