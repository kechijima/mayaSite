import { getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

export default defineNuxtPlugin(() => {
  const { public: { firebase } } = useRuntimeConfig()
  const app = getApps().length ? getApps()[0] : initializeApp(firebase)
  const firestore = getFirestore(app)
  return { provide: { firebaseApp: app, firestore } }
})
