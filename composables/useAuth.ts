import { onAuthStateChanged, type Auth, type User } from 'firebase/auth'

const user = ref<User | null>(null)
const ready = ref(false)
let subscribed = false

// Module-level singleton reactive current-user state for general (non-admin)
// visitors — same pattern as useAdminAuth.ts, but also exposes `ready`
// (flips true once Firebase's initial async session restore has fired) so
// pages/result.vue and pages/kin/[sealIndex].vue can avoid a flash of locked
// content for an already-signed-in returning visitor without each having to
// separately await utils/authReady.ts.
export function useAuth() {
  if (import.meta.client && !subscribed) {
    subscribed = true
    const { $auth } = useNuxtApp()
    onAuthStateChanged($auth as Auth, (firebaseUser) => {
      user.value = firebaseUser
      ready.value = true
    })
  }
  return { user, ready }
}
