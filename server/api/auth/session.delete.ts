// Logout must always succeed even if the cookie is already invalid/expired —
// revoking refresh tokens is a best-effort extra (so a stolen cookie can't be
// replayed after logout), not a precondition for clearing the cookie itself.
export default defineEventHandler(async (event) => {
  const cookie = getCookie(event, SESSION_COOKIE_NAME)

  if (cookie) {
    try {
      const decoded = await getAdminAuth().verifySessionCookie(cookie)
      await getAdminAuth().revokeRefreshTokens(decoded.uid)
    } catch {
      // already invalid/expired, or revocation failed — nothing more to do
    }
  }

  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  return { ok: true }
})
