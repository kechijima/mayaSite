<script setup lang="ts">
import { signOut, type Auth } from 'firebase/auth'

const route = useRoute()
const { user } = useAdminAuth()

// paper-theme.css の html,body{overflow-x:hidden}(公開ページの iPhone 横バウンス対策)は body を
// スクロールコンテナにしてしまい、このレイアウト内の position:sticky(トップバー・検索バー)が
// 効かなくなる。管理画面が表示されている間だけ html にクラスを付け、assets/css/main.css 側で
// overflow-x を clip に切り替える(clip はスクロールコンテナを作らない)。useHead はレイアウトの
// unmount で外れるので、公開ページに戻れば元の hidden に戻る。
useHead({ htmlAttrs: { class: 'admin-shell' } })

const navItems = [
  { to: '/admin', label: 'ダッシュボード', icon: 'grid' },
  { to: '/admin/content', label: '診断コンテンツ管理', icon: 'doc' },
  { to: '/admin/teams', label: 'チーム管理', icon: 'users' },
  { to: '/admin/users', label: 'ユーザー管理', icon: 'users' },
  { to: '/admin/history', label: '診断履歴', icon: 'history' }
]

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

const { withLoading } = useGlobalLoading()

async function logout() {
  close()
  await withLoading(async () => {
    const { $auth } = useNuxtApp()
    await signOut($auth as Auth)
    await navigateTo('/admin/login')
  })
}

// ---- モバイル用ドロワー(md 未満) ----------------------------------------
// 公開側 components/SiteHeader.vue の実装に合わせている(スクリム、背面スクロール固定、
// Esc・画面遷移で閉じる、unmount で overflow を戻す)。違いは、こちらのサイドバーは md 以上でも
// 同じ要素をそのまま常設サイドバーとして使う点。SiteHeader の .sitemenu はデスクトップでは
// display:none なので inert を常時 !open で付けて済んでいたが、ここで同じことをすると
// デスクトップのサイドバーが操作不能になる。そのため matchMedia で md 以上かを持ち、
// inert は「md 未満 かつ 閉じている」ときだけ付ける。
const MD_QUERY = '(min-width: 768px)'
const open = ref(false)
const isDesktop = ref(true)
const burgerEl = ref<HTMLButtonElement | null>(null)
const drawerEl = ref<HTMLElement | null>(null)

function close() {
  open.value = false
}
function toggle() {
  open.value = !open.value
}

watch(() => route.fullPath, close)

watch(open, (isOpen) => {
  if (!import.meta.client) return
  const value = isOpen ? 'hidden' : ''
  document.documentElement.style.overflow = value
  document.body.style.overflow = value
  if (isOpen) {
    nextTick(() => drawerEl.value?.querySelector<HTMLElement>('a, button')?.focus())
  } else {
    burgerEl.value?.focus()
  }
})

function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') close()
}

let mql: MediaQueryList | null = null
function onMediaChange(e: MediaQueryListEvent | MediaQueryList) {
  isDesktop.value = e.matches
  // ドロワーを開いたまま画面幅を広げたとき、スクロール固定だけが残らないように閉じる
  if (e.matches) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  mql = window.matchMedia(MD_QUERY)
  onMediaChange(mql)
  mql.addEventListener('change', onMediaChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  mql?.removeEventListener('change', onMediaChange)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-[#f4f5f3] text-[#132019] md:flex-row dark:bg-[#0e1512] dark:text-[#edf2ef]">
    <!-- モバイル用トップバー(md 以上では非表示) -->
    <!--
      z-50 でスクリム(z-30)とドロワー(z-40)より上に置く。ドロワーは top-14 でこのバーの下から
      始まるので、開いている間もバーガー(× に変形)が隠れずに閉じる操作ができる。
    -->
    <header class="sticky top-0 z-50 flex h-14 flex-none items-center gap-2 border-b border-[#dde1de] bg-white px-2 md:hidden dark:border-[#2a3a32] dark:bg-[#16211c]">
      <button
        ref="burgerEl"
        type="button"
        class="flex h-10 w-10 flex-none flex-col items-center justify-center gap-[5px] rounded-lg text-[#526056] hover:bg-[#eef1ef] dark:text-[#aab8b0] dark:hover:bg-[#1b2721]"
        :aria-expanded="open"
        aria-controls="admin-menu"
        :aria-label="open ? 'メニューを閉じる' : 'メニューを開く'"
        @click="toggle"
      >
        <span
          class="h-[1.5px] w-[22px] rounded bg-current transition-transform motion-reduce:transition-none"
          :class="open ? 'translate-y-[6.5px] rotate-45' : ''"
        />
        <span
          class="h-[1.5px] w-[22px] rounded bg-current transition-opacity motion-reduce:transition-none"
          :class="open ? 'opacity-0' : ''"
        />
        <span
          class="h-[1.5px] w-[22px] rounded bg-current transition-transform motion-reduce:transition-none"
          :class="open ? '-translate-y-[6.5px] -rotate-45' : ''"
        />
      </button>
      <div class="min-w-0 font-display text-[15px] leading-tight">
        JMBマヤ暦 無料診断
        <small class="ml-1.5 font-body text-[10px] tracking-[.1em] text-[#8b968e] dark:text-[#748177]">ADMIN</small>
      </div>
    </header>

    <!-- スクリム(md 以上では非表示) -->
    <div
      class="fixed inset-0 z-30 bg-black/40 transition-opacity motion-reduce:transition-none md:hidden"
      :class="open ? 'opacity-100' : 'pointer-events-none opacity-0'"
      aria-hidden="true"
      @click="close"
    />

    <!--
      サイドバー。md 未満では fixed の左ドロワー(translate-x で出し入れ)、md 以上では従来どおり
      flex の子として常設。md 以上で打ち消しているのはドロワー用の class だけなので、デスクトップの
      見た目は変わらない。
    -->
    <aside
      id="admin-menu"
      ref="drawerEl"
      :inert="(!open && !isDesktop) || undefined"
      class="fixed bottom-0 left-0 top-14 z-40 flex w-[216px] flex-none flex-col gap-1 overflow-y-auto border-r border-[#dde1de] bg-white p-3.5 transition-transform motion-reduce:transition-none md:static md:translate-x-0 md:overflow-visible md:shadow-none dark:border-[#2a3a32] dark:bg-[#16211c]"
      :class="open ? 'translate-x-0 shadow-[18px_0_40px_-24px_rgba(0,0,0,.5)]' : '-translate-x-full'"
    >
      <div class="px-2.5 pb-4.5 pt-1 font-display text-base">
        JMBマヤ暦 無料診断
        <small class="mt-0.5 block font-body text-[10.5px] tracking-[.1em] text-[#8b968e] dark:text-[#748177]">ADMIN CONSOLE</small>
      </div>

      <NuxtLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-[#526056] hover:bg-[#eef1ef] dark:text-[#aab8b0] dark:hover:bg-[#1b2721]"
        :class="isActive(item.to) ? '!bg-[#f3ead9] !text-[#8a6b35] dark:!bg-[#2b2416] dark:!text-[#f0c987]' : ''"
        @click="close"
      >
        <svg v-if="item.icon === 'grid'" width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-none">
          <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="13" y="12" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="2" /><rect x="3" y="14" width="8" height="7" rx="1.5" stroke="currentColor" stroke-width="2" />
        </svg>
        <svg v-else-if="item.icon === 'doc'" width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-none">
          <path d="M4 4h13l3 3v13H4V4z" stroke="currentColor" stroke-width="2" /><path d="M8 10h8M8 14h8M8 18h5" stroke="currentColor" stroke-width="2" />
        </svg>
        <svg v-else-if="item.icon === 'users'" width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-none">
          <circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="2" /><path d="M3.5 20c0-3.6 2.9-6 5.5-6s5.5 2.4 5.5 6" stroke="currentColor" stroke-width="2" /><circle cx="17.5" cy="9" r="2.4" stroke="currentColor" stroke-width="2" /><path d="M15.5 20c.2-2.6 1.8-4.5 4-5" stroke="currentColor" stroke-width="2" />
        </svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" class="flex-none">
          <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" /><path d="M12 7.5V12l3.2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        {{ item.label }}
      </NuxtLink>

      <div class="flex-1"></div>
      <div class="border-t border-[#dde1de] px-3 py-2.5 text-xs text-[#8b968e] dark:border-[#2a3a32] dark:text-[#748177]">
        <b class="block truncate text-[13px] text-[#132019] dark:text-[#edf2ef]">{{ user?.email }}</b>
        管理者アカウント
        <button
          type="button"
          class="mt-2 block text-[11.5px] font-semibold text-brass-700 hover:underline dark:text-gold-300"
          @click="logout"
        >
          ログアウト
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 px-4 pb-16 pt-5 md:px-8 md:pt-9">
      <slot />
    </main>
    <LoadingOverlay />
  </div>
</template>
