<script setup lang="ts">
import { signInWithEmailAndPassword, type Auth } from 'firebase/auth'

const route = useRoute()
const email = ref('')
const password = ref('')
const submitting = ref(false)
const errorMessage = ref('')

const { user: currentUser, ready } = useAuth()

function redirectTarget(): string {
  const target = route.query.redirect
  if (typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')) return target
  return '/'
}
// NuxtLinkのオブジェクト形式(:to="{ query }")はredirect値中の生の?/&を安全に
// 再エンコードしてくれない(ネストしたクエリ文字列が壊れる)ため、文字列としてURLを
// 自前で組み立てる — utils/signupLink.ts と同じ考え方。
const signupLink = computed(() =>
  typeof route.query.redirect === 'string' ? `/signup?redirect=${encodeURIComponent(route.query.redirect)}` : '/signup'
)

// ログイン済みでもフォームを出す(別のアカウントでログインし直せるように)。
// 以前はログイン済みなら戻り先(無ければトップ)へ自動で送っていたが、URLを直接開いた人が
// 理由も分からずトップへ飛ばされ、ログイン後に「戻る」を押すとここで送り返されて
// 前の画面へ戻れなかった(2026-11-12)。

const { withLoading } = useGlobalLoading()

async function submit() {
  errorMessage.value = ''
  submitting.value = true
  const { $auth } = useNuxtApp()
  const auth = $auth as Auth

  try {
    // 認証と遷移が終わるまで画面全体を覆う。押したのに何も起きていないように見える間を作らない。
    await withLoading(async () => {
      await signInWithEmailAndPassword(auth, email.value, password.value)
      // 履歴を置き換える。積むと「戻る」でこのログイン画面に戻ってきてしまい、
      // ログインする前に見ていた画面へ戻れない。
      await navigateTo(redirectTarget(), { replace: true })
    })
  } catch {
    errorMessage.value = 'メールアドレスまたはパスワードが正しくありません'
    submitting.value = false
  }
}
</script>

<template>
  <div class="paper-page paper-page--focus">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MEMBERSHIP</span>
        <h1 class="font-display masthead__title">ログイン</h1>
        <p class="masthead__sub">ログインすると、有料エリアの内容までご覧いただけます。</p>
      </div>

      <div class="mx-auto mt-10 max-w-[440px]">
        <form class="panel space-y-3.5" @submit.prevent="submit">
          <div>
            <label class="formlabel">メールアドレス</label>
            <input v-model="email" type="email" required autocomplete="email" class="formfield" />
          </div>
          <div>
            <label class="formlabel">パスワード</label>
            <input v-model="password" type="password" required autocomplete="current-password" class="formfield" />
          </div>
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button type="submit" class="btn-gold mt-2 w-full" :disabled="submitting">
            {{ submitting ? 'ログイン中…' : 'ログイン' }}
          </button>
        </form>

        <p class="mt-4 text-center text-[12.5px]" style="color: var(--ink-faint);">
          はじめての方は
          <NuxtLink :to="signupLink" class="hover:underline" style="color: var(--gold-deep);">こちらから会員登録</NuxtLink>
        </p>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
