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
// 紹介コード。任意入力で、正しいコードを入れた人だけが有料エリアを閲覧できる。
// 照合ロジックは /account と共通(composables/useReferralCodeInput.ts)。
const referral = useReferralCodeInput()
// コードは有効だったのに users への書き込みでルールに弾かれた場合の案内。
// アカウント自体は作成済みなので、コード無しで作り直したうえでここに表示する。
const codeWarning = ref('')

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
// ただしコードが適用できなかった案内を出している間は止める — 自動遷移してしまうと
// 「登録はできたがコードは付いていない」ことを本人が知らないまま先に進んでしまうため。
watchEffect(() => {
  if (codeWarning.value) return
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
  // 入力があるのに未確認/無効なままなら、ここで確かめてから進む(blurを経ずに
  // Enterで送信された場合に素通りしないよう、送信時にもう一度照合する)。
  if (referral.code.value && !referral.isValid.value) {
    submitting.value = true
    const ok = await referral.validate()
    submitting.value = false
    if (!ok) return
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
    const baseProfile = {
      name: name.value,
      phone: phone.value,
      email: email.value,
      birthdate: birthdate.value,
      gender: gender.value,
      plan: 'free',
      createdAt: serverTimestamp()
    }
    const userRef = doc(firestore, 'users', credential.user.uid)
    if (referral.isValid.value) {
      try {
        await setDoc(userRef, { ...baseProfile, ...referral.redemptionFields() })
      } catch (err) {
        // 照合した後、この書き込みまでの間にコードが無効化されるとルールに弾かれる。
        // ここで諦めるとAuthアカウントだけ作られてusersドキュメントが無い状態
        // (どのページからも会員として扱えない孤児)が残るので、コード無しで作り直す。
        if ((err as { code?: string })?.code !== 'permission-denied') throw err
        await setDoc(userRef, { ...baseProfile, ...unaffiliatedFields() })
        codeWarning.value = 'アカウントは作成されましたが、紹介コードは適用されませんでした。下のボタンから再度お試しください。'
        submitting.value = false
        return
      }
    } else {
      await setDoc(userRef, { ...baseProfile, ...unaffiliatedFields() })
    }
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
        <p class="masthead__sub">紹介コードをお持ちの方は、ご登録時に入力いただくと有料エリアをご覧いただけます。</p>
      </div>

      <div class="mx-auto max-w-[440px]">
        <!-- 照合後に紹介コードが無効化された場合。アカウント自体は作成済みなので、
             フォームに戻さず先へ進む導線だけを出す。 -->
        <div v-if="codeWarning" class="panel text-center">
          <p class="mb-5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">{{ codeWarning }}</p>
          <NuxtLink to="/account" class="btn-gold">紹介コードを登録する</NuxtLink>
        </div>

        <form v-else class="panel space-y-3.5" @submit.prevent="submit">
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
          <div>
            <label class="formlabel">紹介コード（お持ちの方のみ）</label>
            <input
              v-model="referral.input.value"
              type="text"
              inputmode="latin"
              autocapitalize="characters"
              autocomplete="off"
              placeholder="K7M3QP9XR"
              class="formfield"
              style="text-transform: uppercase;"
              @blur="referral.validate()"
            />
            <p
              v-if="referral.message.value"
              class="mt-1.5 text-[12.5px]"
              :style="{ color: referral.isValid.value ? 'var(--gold-deep)' : 'var(--seal-red)' }"
            >{{ referral.message.value }}</p>
            <p v-else class="mt-1.5 text-[12px]" style="color: var(--ink-faint);">
              お持ちでない場合は空欄のままご登録いただけます。
            </p>
          </div>
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button type="submit" class="btn-gold mt-2 w-full" :disabled="submitting || referral.blocksSubmit.value">
            {{ submitting ? '登録中…' : '会員登録する' }}
          </button>
        </form>

        <p v-if="!codeWarning" class="mt-4 text-center text-[12.5px]" style="color: var(--ink-faint);">
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
