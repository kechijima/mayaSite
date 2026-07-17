import { getApps, initializeApp } from 'firebase/app'

export default defineNuxtPlugin(() => {
  const { public: { firebase } } = useRuntimeConfig()
  const app = getApps().length ? getApps()[0] : initializeApp(firebase)
  return { provide: { firebaseApp: app } }
})
