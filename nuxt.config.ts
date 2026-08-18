export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css', '~/assets/css/paper-theme.css'],
  // Fully static SPA on Firebase Hosting's free "Spark" plan — no Nitro server,
  // no Cloud Functions (Functions require the paid "Blaze" plan; see CLAUDE.md
  // "Deployment"). ssr:false means every route renders to an identical empty
  // shell at build time, so there's no crawler-completeness risk (unlike full
  // SSG, which would need every query-driven / redirect-only route — e.g.
  // /result, /admin/login — explicitly listed or risk a silent 404 in prod).
  // vue-router owns all client routing after hydration, backed by Firebase
  // Hosting's catch-all rewrite to this same shell (see firebase.json).
  ssr: false,
  nitro: {
    // preset: 'static' is deliberately NOT set here — it breaks `nuxt dev`
    // ("No entry found in rollupOptions.input"), since that preset assumes a
    // prerendering pipeline the dev server doesn't run. It's applied only for
    // the actual deploy build via `NITRO_PRESET=static` in the `generate` npm
    // script (see package.json), which still gets the same guarantee: the
    // build fails loudly if a server/api/** route is ever reintroduced,
    // instead of silently producing something the static output can't serve.
    prerender: {
      crawlLinks: false,
      routes: ['/']
    }
  },
  // CSSのbackground-imageから参照している装飾画像(top-bg / hero-frame)に、Nuxtが自動で
  // <link rel="prefetch"> を張るのを止める。この2枚はメディアクエリで出し分けており、
  // どの画面幅でも片方しか使わないのに、prefetchのせいで両方(計345KB)落ちてしまうため。
  // manifestのassetsはprefetch/preloadヒントの生成にしか使われないので、外してもCSSからの
  // 読み込みには影響しない。
  hooks: {
    'build:manifest'(manifest) {
      for (const entry of Object.values(manifest)) {
        if (entry.assets) entry.assets = entry.assets.filter((a) => !/(top-bg|hero-frame)\.[^.]+\.webp$/.test(a))
      }
    }
  },
  app: {
    head: {
      title: 'マヤ暦占い',
      htmlAttrs: { lang: 'ja' },
      meta: [{ name: 'description', content: '古代マヤ暦「ツォルキン」であなたの本質と運勢を読み解く診断サイト' }],
      // assets/css/main.css の @import から移動 — <link>ならHTMLのプリロードスキャナが
      // 即座に見つけるので、CSSのダウンロード完了を待たずにフォント取得を始められる。
      // preconnectはgstatic(実フォントファイルの配信元)へのTLS確立を前倒しするため。
      //
      // ウェイトは400のみ。実測(document.fonts)で500/600/italicおよびCinzel Decorativeは
      // 一度もloadedにならず、Cinzelはtailwindのfont-decorative経由でどこからも使われて
      // いなかった。JPフォントはウェイトごとに200超の@font-face(unicode-range分割)が
      // 生成されるため、使わないウェイトを外すだけでCSSのパース量が1/3になる。
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&family=Shippori+Mincho+B1:wght@400&display=swap'
        }
      ]
    }
  },
  runtimeConfig: {
    // No server-only secrets left here — scripts/seedCharacters.ts, scripts/seedTones.ts,
    // scripts/seedKins.ts, and scripts/createAdminUser.ts read FIREBASE_SERVICE_ACCOUNT_KEY
    // directly via `tsx --env-file=.env`, not through Nuxt's runtimeConfig.
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
