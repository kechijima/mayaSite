// Verified admin identity attached by server/middleware/admin-auth.ts once a
// request's __session cookie has been checked for the `admin: true` claim.
declare module 'h3' {
  interface H3EventContext {
    admin?: { uid: string; email: string | null }
  }
}

export {}
