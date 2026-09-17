import { createUserWithEmailAndPassword, updateProfile, type Auth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, type Firestore } from 'firebase/firestore'
import { DEFAULT_GENDER, isGender, type Gender } from '~/utils/gender'
import { safeRedirect } from '~/utils/signupLink'
import type { useReferralCodeInput } from '~/composables/useReferralCodeInput'

// 会員登録フォームの共通処理。pages/signup/index.vue(通常登録 → 無料会員)と
// pages/signup/referral.vue(紹介コード付き登録 → チーム所属 = チーム会員)で共用する。
// 2つのページの違いは「紹介コードを渡すかどうか」だけで、アカウント作成から
// usersドキュメントの作成、遷移までの流れは同じ。
export function useSignupForm() {
  const route = useRoute()
  // /plans などから遷移してきた場合、utils/signupLink.ts が付与した name/birth/gender
  // クエリでフォームを入力済みにする(診断フォームが正しく変換した値なのでバリデーション不要)。
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
  // コードは有効だったのに users への書き込みでルールに弾かれた場合の案内。
  // アカウント自体は作成済みなので、コード無しで作り直したうえでここに表示する。
  const codeWarning = ref('')
  const { withLoading } = useGlobalLoading()
  const { user: currentUser, ready } = useAuth()

  const redirect = computed(() => safeRedirect(route.query.redirect))
  function redirectTarget(): string {
    return redirect.value ?? '/'
  }
  // NuxtLinkのオブジェクト形式(:to="{ query }")はredirect値中の生の?/&を安全に
  // 再エンコードしてくれない(ネストしたクエリ文字列が壊れる)ため、文字列としてURLを
  // 自前で組み立てる。
  const loginLink = computed(() =>
    redirect.value ? `/login?redirect=${encodeURIComponent(redirect.value)}` : '/login'
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

  // referral を渡すと、その紹介コードでチームに所属した状態で作成する。
  // 渡す場合は呼び出し側で validate() 済み(isValid)であること。
  async function submit(referral?: ReturnType<typeof useReferralCodeInput>) {
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
      // アカウント作成・プロフィール更新・usersドキュメント作成・遷移までを一続きで覆う。
      // 通信が数回連なるため、覆わないと押した直後に無反応な時間が生まれる。
      await withLoading(async () => {
        const credential = await createUserWithEmailAndPassword(auth, email.value, password.value)
        await updateProfile(credential.user, { displayName: name.value })
        // useAuth()のuserにdisplayNameの変更を反映させる(composables/useAuth.tsのrefreshUser参照)。
        refreshUser()
        // plan は 'free' 固定で作成する。有料会員の付与は決済導入後にサーバーが行い、
        // firestore.rules でも本人による 'paid' の自己申告はできないようにしている。
        // 紹介コードで登録した人の「チーム会員」は plan ではなく teamId から導出される。
        const baseProfile = {
          name: name.value,
          phone: phone.value,
          email: email.value,
          birthdate: birthdate.value,
          gender: gender.value,
          plan: 'free',
          // plan と suspended は本人が決められない。ルール側でも登録時の値を固定している。
          suspended: false,
          createdAt: serverTimestamp()
        }
        const userRef = doc(firestore, 'users', credential.user.uid)
        if (referral?.isValid.value) {
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
            // 案内を読ませるためこの先の遷移は行わない(watchEffect側もcodeWarningで止まる)。
            return
          }
        } else {
          await setDoc(userRef, { ...baseProfile, ...unaffiliatedFields() })
        }
        await navigateTo(redirectTarget())
      })
    } catch (err) {
      errorMessage.value = mapAuthError(err)
      submitting.value = false
    }
  }

  return {
    name, phone, email, password, passwordConfirm, birthdate, gender,
    submitting, errorMessage, codeWarning, redirect, loginLink, submit
  }
}
