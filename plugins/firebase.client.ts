import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin(() => {
  const { public: { firebase } } = useRuntimeConfig()
  const app = getApps().length ? getApps()[0] : initializeApp(firebase)
  const firestore = getFirestore(app)
  const auth = getAuth(app)

  if (import.meta.dev) {
    // `npm run dev` talks to the local emulators by default (see firebase.json
    // `emulators.firestore.port` / `emulators.auth.port`) — never the real
    // project. Guarded because Vite HMR can re-run this plugin against an
    // already-connected instance, which throws otherwise.
    try {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
    } catch {
      // already connected — ignore
    }
    try {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099')
    } catch {
      // already connected — ignore
    }
  }

  return { provide: { firebaseApp: app, firestore, auth } }
})
