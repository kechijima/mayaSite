import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'media',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue'
  ],
  theme: {
    extend: {
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '9.5': '2.375rem'
      },
      fontFamily: {
        // Cormorant Garamond + Shippori Mincho B1, mirroring mayadan.jp's serif pairing
        // font-decorative (Cinzel Decorative) は2026-08-16に削除 — どこからも使われて
        // おらず、Webフォントを1ファミリ丸ごと無駄に読み込んでいたため。
        display: ['"Cormorant Garamond"', '"Shippori Mincho B1"', '"Yu Mincho"', 'serif'],
        body: ['"Shippori Mincho B1"', '"Hiragino Mincho ProN"', '"Yu Mincho"', 'serif']
      },
      colors: {
        ink: { 950: '#000000', 900: '#0a0a0a', 800: '#121212' },
        gold: { 300: '#f8c871', 500: '#d1a75c', 600: '#a9803f' },
        brass: { 700: '#8a6b35' },
        parchment: { 100: '#f2ede0', 300: '#cfc6ae' }
      },
      backgroundImage: {
        pinstripe: 'repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 36px)'
      }
    }
  },
  plugins: []
}
