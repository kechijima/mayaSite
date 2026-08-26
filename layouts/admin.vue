<script setup lang="ts">
import { signOut, type Auth } from 'firebase/auth'

const route = useRoute()
const { user } = useAdminAuth()

const navItems = [
  { to: '/admin', label: 'ダッシュボード', icon: 'grid' },
  { to: '/admin/content', label: '診断コンテンツ管理', icon: 'doc' },
  { to: '/admin/users', label: 'ユーザー管理', icon: 'users' },
  { to: '/admin/history', label: '診断履歴', icon: 'history' }
]

function isActive(to: string) {
  return to === '/admin' ? route.path === '/admin' : route.path.startsWith(to)
}

async function logout() {
  const { $auth } = useNuxtApp()
  await signOut($auth as Auth)
  await navigateTo('/admin/login')
}
</script>

<template>
  <div class="flex min-h-screen bg-[#f4f5f3] text-[#132019] dark:bg-[#0e1512] dark:text-[#edf2ef]">
    <aside class="flex w-[216px] flex-none flex-col gap-1 border-r border-[#dde1de] bg-white p-3.5 dark:border-[#2a3a32] dark:bg-[#16211c]">
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

    <main class="min-w-0 flex-1 px-8 pb-16 pt-9">
      <slot />
    </main>
  </div>
</template>
