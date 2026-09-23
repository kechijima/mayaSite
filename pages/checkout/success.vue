<script setup lang="ts">
import { PLANS, formatYen, isValidOrder, readCheckoutParams } from '~/utils/checkout'

// お支払い完了(Stripe の success_url 相当)。
// 決済モックでは仮の決済画面が遷移前に解放を書いて refresh 済みなので、ここでは結果を表示する
// だけ。Phase 2 では Stripe から戻ってきた時点でまだ Webhook が users/{uid} を更新していないことが
// あるので、reflected が立つまで useEntitlement().refresh() を数秒おきに呼ぶ(下の onMounted)。
const route = useRoute()
const params = computed(() => readCheckoutParams(route.query))
const order = computed(() => (isValidOrder(params.value) ? params.value : null))
const plan = computed(() => (order.value ? PLANS[order.value.plan] : null))
const backLink = computed(() => params.value.redirect ?? '/')

const { profile, purchasedKins, settled, refresh } = useEntitlement()
// 購入がこの端末の権限に反映されたか。
const reflected = computed(() => {
  if (!order.value || !profile.value) return false
  if (order.value.plan === 'subscription') return profile.value.plan === 'paid'
  return order.value.kin !== null && purchasedKins.value.includes(order.value.kin)
})
onMounted(async () => {
  // Phase 2 の Webhook 待ちを見越して、反映されていなければ数回読み直す(モックでは通常1回目で反映済み)。
  for (let i = 0; i < 5 && settled.value && !reflected.value; i++) {
    await new Promise((r) => setTimeout(r, 1500))
    await refresh()
  }
})
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
          <p v-if="reflected" class="mt-4 text-[12.5px] leading-[1.9]" style="color: var(--ink-soft);">
            <span style="color: var(--gold-deep);">✓</span> 有料エリアが解放されました。診断結果の続きをご覧いただけます。
          </p>
          <p v-else class="mt-4 text-[12.5px] leading-[1.9]" style="color: var(--ink-soft);">
            お支払いの反映を確認しています…。反映まで少し時間がかかる場合は、しばらくしてからページを開き直してください。
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
