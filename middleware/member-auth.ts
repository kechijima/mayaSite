import type { Auth } from 'firebase/auth'

// ログインが前提のページ(マイページ・到達度診断テスト・決済)の入口。未ログインなら、戻り先を
// 付けてログイン画面へ送る。使うページが definePageMeta({ middleware: 'member-auth' }) で指定する
// (/admin/** は admin-auth.global.ts が別に見ている)。
// 以前は各ページが「ログインしてください」の案内を出すだけで、URL を直接開いた人はログイン画面に
// 移らなかった(2026-10-05)。各ページの未ログイン時の案内は、表示中に別タブでログアウトされた
// 場合の受け皿として残してある。
export default defineNuxtRouteMiddleware(async (to) => {
  const { $auth } = useNuxtApp()
  const auth = $auth as Auth

  await authReady(auth)

  if (!auth.currentUser) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
