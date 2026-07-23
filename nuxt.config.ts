export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  // Server routes (server/api/**) need a live Nitro process — plain `nuxt generate`
  // static hosting can't serve them. Build for Cloud Functions gen 2 instead:
  // `npm run build` (see package.json), then `firebase deploy`.
  nitro: {
    preset: 'firebase',
    firebase: { gen: 2 }
  },
  app: {
    head: {
      title: 'マヤ暦占い',
      htmlAttrs: { lang: 'ja' },
      meta: [{ name: 'description', content: '古代マヤ暦「ツォルキン」であなたの本質と運勢を読み解く診断サイト' }]
    }
  },
  runtimeConfig: {
    // Server-only — never exposed to the client bundle. Must be generated manually
    // from Firebase Console → Project Settings → Service Accounts → Generate new
    // private key, then added to the (gitignored) .env as a single-line JSON string.
    firebaseServiceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '',
    public: {
      firebase: {
        apiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBcTsMsEo0eIkB_1khF31aZrp_Bv6GbwXY',
        authDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mayachannel-34fd5.firebaseapp.com',
        projectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID || 'mayachannel-34fd5',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mayachannel-34fd5.firebasestorage.app',
        messagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1048444134303',
        appId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID || '1:1048444134303:web:b96673c71e6dfe690d13aa'
      }
    }
  }
})
