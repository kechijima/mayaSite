<script setup lang="ts">
import { buildSignupLink } from '~/utils/signupLink'

// 通常の会員登録。登録すると無料会員になる。
// 紹介コードでの登録は pages/signup/referral.vue に分けた(そちらはチーム所属 = 有料会員(紹介))。
// フォームの状態と送信処理は composables/useSignupForm.ts に共通化している。
const route = useRoute()
const form = useSignupForm()
const { submitting, errorMessage, loginLink } = form

// 紹介コード付き登録への導線。戻り先と入力済みの name/birth/gender を引き継ぐ。
const referralLink = computed(() => buildSignupLink(form.redirect.value, route.query, '/signup/referral'))
</script>

<template>
  <div class="paper-page paper-page--focus">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MEMBERSHIP</span>
        <h1 class="font-display masthead__title">会員登録</h1>
        <p class="masthead__sub">ご登録いただくと、有料エリアの内容までご覧いただけます。</p>
      </div>

      <div class="signupwrap">
        <form class="panel signupform" @submit.prevent="form.submit()">
          <SignupProfileFields :form="form" />
          <p v-if="errorMessage" class="notice">{{ errorMessage }}</p>
          <button type="submit" class="btn-gold" :disabled="submitting">
            {{ submitting ? '登録中…' : '会員登録する' }}
          </button>
        </form>

        <p class="mt-4 text-center text-[12.5px]" style="color: var(--ink-faint);">
          紹介コードをお持ちの方は
          <NuxtLink :to="referralLink" class="hover:underline" style="color: var(--gold-deep);">こちらから登録</NuxtLink>
        </p>
        <p class="mt-2 text-center text-[12.5px]" style="color: var(--ink-faint);">
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
