<script setup lang="ts">
import { parseKin } from '~/utils/mayaCalc'
import { buildSignupLink, safeRedirect } from '~/utils/signupLink'

// 購入プラン選択。有料エリア(LockedVeil)の「続きを購入する」は、ログイン状態に関わらず
// 全てここへ来る(composables/usePlansLink.ts)。
//
//   有料会員     ￥5,500/月(税込) … すべての診断結果が読み放題。おすすめとして強調する
//   この記事のみ ￥550(税込)     … ?kin=N の診断結果一式。kin が無ければ出さない
//
// 決済(Stripe)は未導入。現在は会員登録すれば有料エリアを閲覧できるので、どちらのボタンも
// 未ログインなら会員登録(/signup)、ログイン済みなら元のページ(redirect)へ送る。
// 決済導入時は planAction() を Stripe Checkout への遷移に差し替える(未ログインなら先に登録/ログイン)。
const route = useRoute()
const { user, ready } = useAuth()

const kin = computed(() => parseKin(route.query.kin))
const redirect = computed(() => safeRedirect(route.query.redirect))

// Phase 1(決済未導入)の遷移先。2つのプランで同じだが、決済導入時に分かれるので関数にしておく。
function planAction(_plan: 'subscription' | 'single'): string {
  if (ready.value && user.value) return redirect.value ?? '/'
  return buildSignupLink(redirect.value, route.query)
}
const subscriptionLink = computed(() => planAction('subscription'))
const singleLink = computed(() => planAction('single'))

const loginLink = computed(() => (redirect.value ? `/login?redirect=${encodeURIComponent(redirect.value)}` : '/login'))
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">PLANS</span>
        <h1 class="font-display masthead__title">プランを選ぶ</h1>
        <p class="masthead__sub">診断結果の続きをご覧いただくためのプランをお選びください。</p>
      </div>

      <div class="plans">
        <!-- おすすめ。DOM順でも先頭にして、モバイルの縦積みで最初に目に入るようにする。
             2カラム(640px以上)では CSS の order で右側に置く(左は「この記事のみ」)。 -->
        <section class="plancard plancard--reco" aria-labelledby="plan-subscription">
          <span class="plancard__badge">おすすめ</span>
          <h2 id="plan-subscription" class="plancard__name">有料会員</h2>
          <p class="plancard__price"><strong>￥5,500</strong><small>/月</small></p>
          <p class="plancard__tax">税込</p>
          <ul class="plancard__features">
            <li><svg><use href="#i-check" /></svg>すべてのKINの診断結果が読み放題</li>
            <li><svg><use href="#i-check" /></svg>ご家族・ご友人のKINや関係性・運命数字の詳細も</li>
            <li><svg><use href="#i-check" /></svg>いつでも続きをご覧いただけます</li>
          </ul>
          <NuxtLink :to="subscriptionLink" class="btn-gold">有料会員になる</NuxtLink>
        </section>

        <section v-if="kin !== null" class="plancard" aria-labelledby="plan-single">
          <h2 id="plan-single" class="plancard__name">この記事のみ</h2>
          <p class="plancard__target">KIN{{ kin }} の診断結果</p>
          <p class="plancard__price"><strong>￥550</strong></p>
          <p class="plancard__tax">税込・1回のお支払い</p>
          <ul class="plancard__features">
            <li><svg><use href="#i-check" /></svg>KIN{{ kin }} の診断結果の有料エリアをすべて</li>
            <li><svg><use href="#i-check" /></svg>このKINの関係性・運命数字の詳細も</li>
          </ul>
          <NuxtLink :to="singleLink" class="btn-outline">この記事を購入する</NuxtLink>
        </section>
      </div>

      <div class="mx-auto mt-10 max-w-[440px] text-center">
        <p v-if="ready && !user" class="text-[12.5px]" style="color: var(--ink-faint);">
          すでに会員登録済みの方は
          <NuxtLink :to="loginLink" class="hover:underline" style="color: var(--gold-deep);">こちらからログイン</NuxtLink>
        </p>
        <NuxtLink :to="redirect ?? '/'" class="mt-5 block text-[12px] hover:underline" style="color: var(--ink-faint);">
          {{ redirect ? '元のページへ戻る' : 'トップへ戻る' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
