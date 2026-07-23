// Guards /admin/** (SSR pages) and /api/admin/** (API routes) — the only
// enforcement point for "is this request allowed into the admin console."
// /api/auth/session doesn't match /api/admin/, so it's never gated by this
// (no chicken-and-egg with logging in). /admin/login is handled specially:
// shown as-is unless the visitor already has a valid admin session, in which
// case they're bounced straight to /admin.
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const isAdminApi = path.startsWith('/api/admin/')
  const isLoginPage = path === '/admin/login'
  const isAdminPage = (path === '/admin' || path.startsWith('/admin/')) && !isLoginPage

  if (!isAdminApi && !isAdminPage && !isLoginPage) return

  const cookie = getCookie(event, SESSION_COOKIE_NAME)

  if (isLoginPage) {
    if (cookie) {
      try {
        const decoded = await getAdminAuth().verifySessionCookie(cookie, true)
        if (decoded.admin === true) return sendRedirect(event, '/admin', 302)
      } catch {
        // invalid/expired — fall through and show the login page
      }
    }
    return
  }

  const unauthorized = () => {
    if (isAdminApi) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    return sendRedirect(event, `/admin/login?redirect=${encodeURIComponent(path)}`, 302)
  }

  if (!cookie) return unauthorized()

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true)
    if (decoded.admin !== true) throw new Error('not-admin')
    event.context.admin = { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
    return unauthorized()
  }
})
