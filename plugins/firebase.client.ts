import { getApps, initializeApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin(() => {
  const { public: { firebase } } = useRuntimeConfig()
  const app = getApps().length ? getApps()[0] : initializeApp(firebase)
  const firestore = getFirestore(app)

  if (import.meta.dev) {
    // `npm run dev` talks to the local Firestore emulator by default (see
    // firebase.json `emulators.firestore.port`) — never the real project.
    // Guarded because Vite HMR can re-run this plugin against an
    // already-connected Firestore instance, which throws otherwise.
    try {
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
    } catch {
      // already connected — ignore
    }
  }

  return { provide: { firebaseApp: app, firestore } }
})
