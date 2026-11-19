<script setup lang="ts">
import { sendPasswordResetEmail, type Auth } from 'firebase/auth'

// パスワードの再設定(2026-11-19 要望)。Firebase Auth の再設定メールを送るだけ — メールのリンク先は
// Firebase が用意する再設定画面で、新しいパスワードはそこで決める(このサイトにサーバーは無い)。
// 登録されていないメールアドレスでも同じ「送信しました」を出す。分けると、そのアドレスが会員かどうかを
// 外から確かめられてしまうため。
const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const sent = ref(false)
const errorMessage = ref('')
const { withLoading } = useGlobalLoading()

const loginLink = computed(() =>
  typeof route.query.redirect === 'string' ? `/login?redirect=${encodeURIComponent(route.query.redirect)}` : '/login'
)

async function submit() {
  errorMessage.value = ''
  const { $auth } = useNuxtApp()
  try {
    await withLoading(async () => {
      const auth = $auth as Auth
      auth.languageCode = 'ja'
      await sendPasswordResetEmail(auth, email.value.trim())
    })
    sent.value = true
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === 'auth/user-not-found') {
      sent.value = true
    } else if (code === 'auth/invalid-email') {
      errorMessage.value = 'メールアドレスの形式が正しくありません'
    } else if (code === 'auth/too-many-requests') {
      errorMessage.value = '短時間に何度も送信されました。しばらくしてからお試しください'
    } else {
      errorMessage.value = '送信できませんでした。通信環境をご確認のうえ、もう一度お試しください'
    }
  }
}
</script>

<template>
  <div class="paper-page paper-page--focus">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MEMBERSHIP</span>
        <h1 class="font-display masthead__title">パスワードの再設定</h1>
        <p class="masthead__sub">ご登録のメールアドレスに、パスワードを再設定するためのメールをお送りします。</p>
      </div>

      <div class="mx-auto mt-10 max-w-[440px]">
        <section v-if="sent" class="panel text-center">
          <p class="mb-2 text-[14.5px]">再設定のメールを送信しました。</p>
          <p class="mb-5 text-[12.5px] leading-[1.9]" style="color: var(--ink-soft);">
            {{ email }} 宛のメールに記載のリンクから、新しいパスワードを設定してください。<br />
            メールが届かない場合は、迷惑メールフォルダもご確認ください。
          </p>
          <NuxtLink :to="loginLink" class="btn-gold w-full">ログイン画面へ</NuxtLink>
        </section>

        <form v-else class="panel space-y-3.5" @submit.prevent="submit">
          <div>
            <label class="formlabel" for="reset-email">メールアドレス</label>
            <input id="reset-email" v-model="email" type="email" required autocomplete="email" class="formfield" />
          </div>
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button type="submit" class="btn-gold mt-2 w-full">再設定のメールを送る</button>
        </form>

        <NuxtLink :to="loginLink" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          ログイン画面へ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
