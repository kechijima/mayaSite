<script setup lang="ts">
import { buildSignupLink } from '~/utils/signupLink'

// 紹介コード付きの会員登録。通常の項目に加えてチーム選択と紹介コードを入力してもらい、
// 選んだチームのコードであれば、そのチームに所属した状態でアカウントを作る。
// チーム所属中は有料会員(紹介)として扱われる(utils/userAdmin.ts の userStatus)。
//
// チーム・コードは必須。コードなしで登録したい人は pages/signup/index.vue へ案内する。
// 実際の検証は firestore.rules の redeemsCode が users への書き込み時に行う
// (teamId/teamName がコード文書と一致すること)。ここでの照合は入力補助。
const route = useRoute()
const form = useSignupForm()
const { submitting, errorMessage, codeWarning } = form
const referral = useReferralCodeInput()
const { withLoading } = useGlobalLoading()

const plainSignupLink = computed(() => buildSignupLink(form.redirect.value, route.query))
// 登録済みの人はログイン後に /account でコードを入れてもらう。/account はコード登録後に
// redirect(元のページ)へ戻すので、それも引き継ぐ。
const loginToAccountLink = computed(() => {
  const account = form.redirect.value ? `/account?redirect=${encodeURIComponent(form.redirect.value)}` : '/account'
  return `/login?redirect=${encodeURIComponent(account)}`
})

async function submit() {
  // blur を経ずに Enter で送信された場合や、照合結果が古い場合に備えて送信時にも確かめる。
  if (!referral.isValid.value) {
    const ok = await withLoading(() => referral.validate())
    if (!ok) return
  }
  await form.submit(referral)
}
</script>

<template>
  <div class="paper-page paper-page--focus">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MEMBERSHIP</span>
        <h1 class="font-display masthead__title">紹介コードで会員登録</h1>
        <p class="masthead__sub">チームと紹介コードを入力してご登録ください。ご登録後は有料会員として、すべての診断結果をご覧いただけます。</p>
      </div>

      <div class="signupwrap">
        <!-- 照合後に紹介コードが無効化された場合。アカウント自体は作成済みなので、
             フォームに戻さず先へ進む導線だけを出す。 -->
        <div v-if="codeWarning" class="panel text-center">
          <p class="mb-5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">{{ codeWarning }}</p>
          <NuxtLink to="/account" class="btn-gold">紹介コードを登録する</NuxtLink>
        </div>

        <form v-else class="panel signupform" @submit.prevent="submit">
          <SignupProfileFields :form="form" />
          <ReferralCodeFields :referral="referral" />
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button
            type="submit"
            class="btn-gold"
            :disabled="submitting || !referral.selectedTeamId.value || !referral.code.value"
          >
            {{ submitting ? '登録中…' : '有料会員として登録する' }}
          </button>
        </form>

        <template v-if="!codeWarning">
          <p class="mt-4 text-center text-[12.5px]" style="color: var(--ink-faint);">
            紹介コードをお持ちでない方は
            <NuxtLink :to="plainSignupLink" class="hover:underline" style="color: var(--gold-deep);">こちらから登録</NuxtLink>
          </p>
          <p class="mt-2 text-center text-[12.5px]" style="color: var(--ink-faint);">
            すでに会員登録済みの方は
            <NuxtLink :to="loginToAccountLink" class="hover:underline" style="color: var(--gold-deep);">ログイン</NuxtLink>
            のうえ、マイページから紹介コードをご登録ください
          </p>
        </template>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
