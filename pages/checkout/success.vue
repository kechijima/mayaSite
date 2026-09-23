<script setup lang="ts">
import { PLANS, formatYen, isValidOrder, readCheckoutParams } from '~/utils/checkout'

// お支払い完了(Stripe の success_url 相当)。
// Phase 2 では、Stripe から戻ってきた時点ではまだ Webhook が users/{uid} を更新していないことが
// あるので、ここで useEntitlement().refresh() を数秒おきに呼び、plan / purchases が反映されたら
// 「完了」表示に切り替える(それまでは「反映中」)。今は決済が無いので最初から「完了」を出す。
const route = useRoute()
const params = computed(() => readCheckoutParams(route.query))
const order = computed(() => (isValidOrder(params.value) ? params.value : null))
const plan = computed(() => (order.value ? PLANS[order.value.plan] : null))
const backLink = computed(() => params.value.redirect ?? '/')
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">THANK YOU</span>
        <h1 class="font-display masthead__title">お支払いが完了しました</h1>
        <p class="masthead__sub">ご購入ありがとうございます。</p>
      </div>

      <div class="mx-auto mt-8 max-w-[480px] space-y-4">
        <CheckoutMockNotice />

        <section class="panel panel--plan text-center">
          <svg class="mx-auto mb-3 h-9 w-9" style="color: var(--gold);" aria-hidden="true"><use href="#i-check" /></svg>
          <template v-if="plan">
            <p class="text-[15px] font-bold">{{ plan.name }}<template v-if="order?.kin !== null">（KIN{{ order?.kin }}）</template></p>
            <p class="mt-1 text-[13px]" style="color: var(--ink-soft);">{{ formatYen(plan.price) }}{{ plan.id === 'subscription' ? '/月' : '' }}（税込）</p>
          </template>
          <p class="mt-4 text-[12.5px] leading-[1.9]" style="color: var(--ink-soft);">
            診断結果の続きをご覧いただけます。反映まで少し時間がかかる場合は、しばらくしてからページを開き直してください。
          </p>
          <NuxtLink :to="backLink" class="btn-gold mt-5 w-full">{{ params.redirect ? '診断結果の続きを読む' : 'トップへ戻る' }}</NuxtLink>
        </section>

        <NuxtLink to="/account" class="block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          マイページでプランを確認する
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
