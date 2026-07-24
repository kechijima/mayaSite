<script setup lang="ts">
import { signInWithEmailAndPassword, signOut, type Auth } from 'firebase/auth'

definePageMeta({ layout: 'admin-plain' })

const route = useRoute()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

function redirectTarget(): string {
  const target = route.query.redirect
  // only allow same-origin relative paths — a query-string redirect target
  // is attacker-controlled input, don't let it point off-site.
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target
  return '/admin'
}

async function submit() {
  submitting.value = true
  errorMessage.value = ''
  const { $auth } = useNuxtApp()

  try {
    const credential = await signInWithEmailAndPassword($auth as Auth, email.value, password.value)
    const idToken = await credential.user.getIdToken()
    await $fetch('/api/auth/session', { method: 'POST', body: { idToken } })
    // Hard navigation, not navigateTo() — the admin layout reads identity
    // from event.context during SSR, which only runs on a real page load.
    window.location.href = redirectTarget()
  } catch {
    try {
      await signOut($auth as Auth)
    } catch {
      // wasn't signed in / already signed out — fine
    }
    errorMessage.value = 'メールアドレスまたはパスワードが正しくありません'
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1 text-lg font-bold">管理者ログイン</h1>
    <p class="mb-5 text-xs text-slate-500 dark:text-slate-400">管理画面にアクセスするにはログインしてください。</p>

    <form class="space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">メールアドレス</label>
        <input v-model="email" type="email" required autocomplete="username" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
      </div>
      <div>
        <label class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">パスワード</label>
        <input v-model="password" type="password" required autocomplete="current-password" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
      </div>

      <div v-if="errorMessage" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ errorMessage }}</div>

      <button
        type="submit"
        class="w-full rounded-lg bg-brass-700 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        :disabled="submitting"
      >
        {{ submitting ? 'ログイン中…' : 'ログイン' }}
      </button>
    </form>
  </div>
</template>
