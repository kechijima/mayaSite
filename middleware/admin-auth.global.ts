import { getIdTokenResult, type Auth } from 'firebase/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const isAdminRoute = to.path === '/admin' || to.path.startsWith('/admin/')
  if (!isAdminRoute || to.path === '/admin/login') return

  const { $auth } = useNuxtApp()
  const auth = $auth as Auth

  await authReady(auth)

  const currentUser = auth.currentUser
  if (!currentUser) {
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const token = await getIdTokenResult(currentUser)
  if (token.claims.admin !== true) {
    return navigateTo(`/admin/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
