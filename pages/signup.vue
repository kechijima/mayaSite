<script setup lang="ts">
import { createUserWithEmailAndPassword, updateProfile, type Auth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore'
import { DEFAULT_GENDER, isGender, type Gender } from '~/utils/gender'

const route = useRoute()
// 診断結果ページ(pages/result.vue)・紋章詳細ページ(pages/kin/[sealIndex].vue)から
// 遷移してきた場合、utils/signupLink.tsが付与したname/birth/genderクエリで
// フォームを入力済みにする(diagnosisContentが正しく変換した値なのでバリデーション不要)。
const name = ref((route.query.name as string) || '')
const phone = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const birthdate = ref((route.query.birth as string) || '')
const gender = ref<Gender>(
  typeof route.query.gender === 'string' && isGender(route.query.gender) ? route.query.gender : DEFAULT_GENDER
)
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
// 自前で組み立てる — pages/result.vueのsignupRedirectToと同じ考え方。
const loginLink = computed(() =>
  typeof route.query.redirect === 'string' ? `/login?redirect=${encodeURIComponent(route.query.redirect)}` : '/login'
)

// 既にログイン済みの状態でこのページに来た場合は、登録フォームを出さずそのまま遷移先へ流す。
watchEffect(() => {
  if (ready.value && currentUser.value) navigateTo(redirectTarget())
})

function mapAuthError(err: unknown): string {
  const code = (err as { code?: string } | null)?.code
  if (code === 'auth/email-already-in-use') return 'このメールアドレスは既に登録されています'
  if (code === 'auth/invalid-email') return 'メールアドレスの形式が正しくありません'
  if (code === 'auth/weak-password') return 'パスワードは6文字以上で入力してください'
  return '登録に失敗しました。時間をおいて再度お試しください'
}

async function submit() {
  errorMessage.value = ''
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'パスワードが一致しません'
    return
  }
  submitting.value = true
  const { $auth, $firestore } = useNuxtApp()
  const auth = $auth as Auth
  const firestore = $firestore as Firestore

  try {
    const credential = await createUserWithEmailAndPassword(auth, email.value, password.value)
    await updateProfile(credential.user, { displayName: name.value })
    // useAuth()のuserにdisplayNameの変更を反映させる(composables/useAuth.tsのrefreshUser参照)。
    refreshUser()
    // plan は将来の決済導入に備えた予約フィールド。'free'固定で作成させ、書き込みも
    // firestore.rulesでplanフィールドだけ管理者限定にしているため、本人がここを
    // 自己申告で'paid'にすることはできない。
    await setDoc(doc(firestore, 'users', credential.user.uid), {
      name: name.value,
      phone: phone.value,
      email: email.value,
      birthdate: birthdate.value,
      gender: gender.value,
      plan: 'free',
      createdAt: serverTimestamp()
    })
    await navigateTo(redirectTarget())
  } catch (err) {
    errorMessage.value = mapAuthError(err)
    submitting.value = false
  }
}
</script>

<template>
  <div class="paper-page min-h-screen">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MEMBERSHIP</span>
        <h1 class="font-display masthead__title">会員登録</h1>
        <p class="masthead__sub">登録すると、有料エリアの内容までご覧いただけます。</p>
      </div>

      <div class="mx-auto max-w-[440px]">
        <form class="panel space-y-3.5" @submit.prevent="submit">
          <div>
            <label class="formlabel">お名前</label>
            <input v-model="name" type="text" required autocomplete="name" class="formfield" />
          </div>
          <div>
            <label class="formlabel">生年月日</label>
            <BirthdateSelect v-model="birthdate" theme="paper" />
          </div>
          <div>
            <label class="formlabel">性別</label>
            <GenderRadio v-model="gender" />
          </div>
          <div>
            <label class="formlabel">電話番号</label>
            <input v-model="phone" type="tel" required autocomplete="tel" class="formfield" />
          </div>
          <div>
            <label class="formlabel">メールアドレス</label>
            <input v-model="email" type="email" required autocomplete="email" class="formfield" />
          </div>
          <div>
            <label class="formlabel">パスワード</label>
            <input v-model="password" type="password" required minlength="6" autocomplete="new-password" class="formfield" />
          </div>
          <div>
            <label class="formlabel">パスワード（確認）</label>
            <input v-model="passwordConfirm" type="password" required minlength="6" autocomplete="new-password" class="formfield" />
          </div>
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button type="submit" class="btn-gold mt-2 w-full" :disabled="submitting">
            {{ submitting ? '登録中…' : '会員登録する' }}
          </button>
        </form>

        <p class="mt-4 text-center text-[12.5px]" style="color: var(--ink-faint);">
          すでに会員登録済みの方は
          <NuxtLink :to="loginLink" class="hover:underline" style="color: var(--gold-deep);">こちらからログイン</NuxtLink>
        </p>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
