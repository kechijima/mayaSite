// Exchanges a freshly-signed-in Firebase ID token for a `__session` cookie —
// but only if the token belongs to a user with the `admin: true` custom
// claim. This is the one place "is this user an admin" is ever decided;
// nothing downstream trusts the client's say-so. Deliberately independent of
// how the ID token was obtained (email/password today, any provider later).
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const idToken = body?.idToken

  if (typeof idToken !== 'string' || !idToken) {
    throw createError({ statusCode: 400, statusMessage: 'idToken is required' })
  }

  let decoded
  try {
    decoded = await getAdminAuth().verifyIdToken(idToken)
  } catch {
    throw createError({ statusCode: 401, statusMessage: 'Invalid ID token' })
  }

  if (decoded.admin !== true) {
    throw createError({ statusCode: 403, statusMessage: 'Not an admin account' })
  }

  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_COOKIE_MAX_AGE_SECONDS * 1000
  })

  setCookie(event, SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS
  })

  return { ok: true }
})
