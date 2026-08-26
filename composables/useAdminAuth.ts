import { onAuthStateChanged, type Auth, type User } from 'firebase/auth'

const user = ref<User | null>(null)
let subscribed = false

// Module-level singleton reactive current-user state, purely for display
// (layouts/admin.vue's signed-in-as footer). NOT used for route guarding —
// see middleware/admin-auth.global.ts, which reads $auth.currentUser
// directly to avoid racing this listener's own async firing.
export function useAdminAuth() {
  if (import.meta.client && !subscribed) {
    subscribed = true
    const { $auth } = useNuxtApp()
    onAuthStateChanged($auth as Auth, (firebaseUser) => {
      user.value = firebaseUser
    })
  }
  return { user }
}
