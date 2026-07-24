import { onAuthStateChanged, type Auth } from 'firebase/auth'

let readyPromise: Promise<void> | null = null

// Resolves once Firebase Auth's one-time initial session restore has
// completed (auth.currentUser is unreliable — synchronously null even for an
// already-signed-in user — until then, since it's restored async from
// IndexedDB). Memoized: only the very first /admin/** navigation on a cold
// load actually waits. Every check after that resolves immediately and the
// caller should read auth.currentUser live, not a value cached from this
// promise — that's what keeps this from racing a just-completed sign-in in
// pages/admin/login.vue.
export function authReady(auth: Auth): Promise<void> {
  if (!readyPromise) {
    readyPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe()
        resolve()
      })
    })
  }
  return readyPromise
}
