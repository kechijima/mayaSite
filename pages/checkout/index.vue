<script setup lang="ts">
import { PLANS, buildPayLink, buildPlansLink, formatYen, isValidOrder, readCheckoutParams } from '~/utils/checkout'

// 注文内容の確認(決済フローの1画面目)。/plans でプランを選ぶとここに来る。
// 未ログインの場合、/plans は先に会員登録へ送り、登録後にこのページへ戻す(purchases は
// ログイン必須 — Phase 2 の合意)。
//
// Phase 2 では「お支払いへ進む」が Cloud Function(Checkout セッション作成)を呼んで Stripe の
// ページへ遷移する。今は仮の決済画面(/checkout/pay)へ進むだけ。詳細は utils/checkout.ts。
const route = useRoute()
const { user, ready } = useAuth()
const { profile, settled, suspended, purchasedKins } = useEntitlement()

const params = computed(() => readCheckoutParams(route.query))
const order = computed(() => (isValidOrder(params.value) ? params.value : null))
const plan = computed(() => (order.value ? PLANS[order.value.plan] : null))

const plansLink = computed(() => buildPlansLink(params.value.kin, params.value.redirect))
const payLink = computed(() => (order.value ? buildPayLink(order.value) : plansLink.value))
// 未ログインでここを直接開いた場合。登録・ログイン後にこの注文へ戻す。
const loginLink = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
const signupLink = computed(() => `/signup?redirect=${encodeURIComponent(route.fullPath)}`)

// 購入できない状態。Phase 2 の合意: 利用停止は購入より優先、チーム会員は全て読めるので
// 購入する意味がない、有料会員が有料会員をもう一度買うことはない。
const blocker = computed<'suspended' | 'team' | 'already-paid' | 'already-bought' | null>(() => {
  if (!profile.value) return null
  if (suspended.value) return 'suspended'
  if (profile.value.teamId) return 'team'
  if (profile.value.plan === 'paid') return 'already-paid'
  if (order.value?.plan === 'single' && order.value.kin !== null && purchasedKins.value.includes(order.value.kin)) return 'already-bought'
  return null
})
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">CHECKOUT</span>
        <h1 class="font-display masthead__title">ご注文内容の確認</h1>
      </div>

      <div class="mx-auto mt-8 max-w-[560px] space-y-4">
        <CheckoutMockNotice />

        <!-- 注文として成立しない(plan が無い / 単体購入なのに kin が無い) -->
        <section v-if="!order || !plan" class="panel text-center">
          <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">ご注文内容を確認できませんでした。プランを選び直してください。</p>
          <NuxtLink :to="plansLink" class="btn-gold">プランを選ぶ</NuxtLink>
        </section>

        <section v-else-if="!ready || (user && !settled)" class="panel">
          <p class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>
        </section>

        <section v-else-if="!user" class="panel text-center">
          <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">ご購入には会員登録とログインが必要です。</p>
          <div class="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <NuxtLink :to="signupLink" class="btn-gold">会員登録する</NuxtLink>
            <NuxtLink :to="loginLink" class="btn-outline">ログインする</NuxtLink>
          </div>
        </section>

        <section v-else-if="blocker" class="panel text-center">
          <template v-if="blocker === 'suspended'">
            <p class="mb-2 text-[14.5px]">現在このアカウントはご利用いただけません。</p>
            <p class="text-[12.5px]" style="color: var(--ink-faint);">お手数ですがお問い合わせください。</p>
          </template>
          <template v-else-if="blocker === 'team'">
            <p class="mb-2 text-[14.5px]"><span style="color: var(--gold-deep);">✓</span> {{ profile?.teamName || 'チーム' }}に所属しています</p>
            <p class="mb-4 text-[13px] leading-[1.9]" style="color: var(--ink-soft);">チーム会員としてすべての診断結果をご覧いただけるため、お支払いは不要です。</p>
            <NuxtLink :to="params.redirect ?? '/'" class="btn-outline">診断結果へ戻る</NuxtLink>
          </template>
          <template v-else-if="blocker === 'already-bought'">
            <p class="mb-2 text-[14.5px]"><span style="color: var(--gold-deep);">✓</span> KIN{{ order.kin }} の記事は購入済みです</p>
            <p class="mb-4 text-[13px] leading-[1.9]" style="color: var(--ink-soft);">この記事の有料エリアはすでにご覧いただけます。</p>
            <NuxtLink :to="params.redirect ?? '/'" class="btn-outline">診断結果へ戻る</NuxtLink>
          </template>
          <template v-else>
            <p class="mb-2 text-[14.5px]"><span style="color: var(--gold-deep);">✓</span> すでに有料会員です</p>
            <p class="mb-4 text-[13px] leading-[1.9]" style="color: var(--ink-soft);">すべての診断結果をご覧いただけます。</p>
            <NuxtLink :to="params.redirect ?? '/'" class="btn-outline">診断結果へ戻る</NuxtLink>
          </template>
        </section>

        <template v-else>
          <section class="panel panel--plan">
            <dl class="orderlist">
              <div><dt>プラン</dt><dd class="font-bold">{{ plan.name }}</dd></div>
              <div v-if="order.kin !== null"><dt>対象</dt><dd>KIN{{ order.kin }} の診断結果</dd></div>
              <div><dt>お支払い</dt><dd>{{ plan.billing }}</dd></div>
              <div><dt>ご登録メール</dt><dd class="break-all">{{ user.email }}</dd></div>
              <div class="orderlist__total"><dt>お支払い金額</dt><dd><strong>{{ formatYen(plan.price) }}</strong><small>{{ plan.id === 'subscription' ? '/月' : '' }}（税込）</small></dd></div>
            </dl>
            <p v-if="plan.id === 'subscription'" class="mt-3 text-[11.5px] leading-[1.8]" style="color: var(--ink-faint);">
              毎月同じ日に自動で更新されます。解約はマイページからいつでも行えます（解約後の閲覧期間は準備中です）。
            </p>
            <NuxtLink :to="payLink" class="btn-gold mt-5 w-full">お支払いへ進む</NuxtLink>
          </section>

          <p class="text-center text-[11.5px] leading-[1.8]" style="color: var(--ink-faint);">
            お支払いに進むことで
            <NuxtLink to="/legal/tokushoho" class="hover:underline" style="color: var(--gold-deep);">特定商取引法に基づく表記</NuxtLink>
            に同意したものとみなします。
          </p>
        </template>

        <NuxtLink :to="plansLink" class="mt-2 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          プラン選択に戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
