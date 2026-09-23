<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { PLANS, applyMockPurchase, buildPlansLink, buildSuccessLink, formatYen, isValidOrder, readCheckoutParams } from '~/utils/checkout'

// 【仮の決済画面】Stripe がホストする Checkout ページの置き換え。決済導入後は Stripe の
// ページそのものに遷移するので、このファイルは削除する(utils/checkout.ts のコメント参照)。
// カード入力欄は見た目だけで、何も検証せず、どこにも送らない。
//   支払う      → 解放を書き込んで /checkout/success(Stripe の success_url 相当)
//   キャンセル  → /plans?canceled=1(Stripe の cancel_url 相当)
// 「支払う」で users/{uid}.plan または users/{uid}/unlocks を本人の権限で書く
// (utils/checkout.ts の applyMockPurchase、firestore.rules の【決済モック期間限定】分岐)。
// これで無料会員が仮の決済を通ると有料エリアが見えるようになる(2026-09-23)。
const route = useRoute()
const { user, ready } = useAuth()
const { refresh: refreshEntitlement } = useEntitlement()
const { withLoading } = useGlobalLoading()
const payError = ref('')

const params = computed(() => readCheckoutParams(route.query))
const order = computed(() => (isValidOrder(params.value) ? params.value : null))
const plan = computed(() => (order.value ? PLANS[order.value.plan] : null))
const cancelLink = computed(() => buildPlansLink(params.value.kin, params.value.redirect, true))

const card = reactive({ number: '', exp: '', cvc: '', name: '' })
const paying = ref(false)

async function pay() {
  if (!order.value || !user.value || paying.value) return
  paying.value = true
  payError.value = ''
  try {
    await withLoading(async () => {
      const { $firestore } = useNuxtApp()
      await applyMockPurchase($firestore as Firestore, user.value!.uid, order.value!)
      // 解放を反映してから遷移する。先に遷移すると、戻った先がまだロック状態のまま描画される。
      await refreshEntitlement()
    })
    await navigateTo(buildSuccessLink(order.value))
  } catch (err) {
    payError.value = (err as { code?: string })?.code === 'permission-denied'
      ? 'お支払いを受け付けられませんでした。アカウントの状態をご確認ください。'
      : 'お支払いに失敗しました。時間をおいて再度お試しください。'
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">PAYMENT</span>
        <h1 class="font-display masthead__title">お支払い</h1>
        <p class="masthead__sub">（仮の決済画面 — 導入後は Stripe のお支払いページに置き換わります）</p>
      </div>

      <div class="mx-auto mt-8 max-w-[480px] space-y-4">
        <CheckoutMockNotice />

        <section v-if="!order || !plan" class="panel text-center">
          <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">ご注文内容を確認できませんでした。</p>
          <NuxtLink :to="buildPlansLink(null, params.redirect)" class="btn-gold">プランを選ぶ</NuxtLink>
        </section>

        <section v-else-if="ready && !user" class="panel text-center">
          <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">お支払いにはログインが必要です。</p>
          <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="btn-gold">ログインする</NuxtLink>
        </section>

        <form v-else class="panel space-y-3" @submit.prevent="pay">
          <div class="mb-1 flex items-baseline justify-between gap-3">
            <span class="text-[13px]" style="color: var(--ink-soft);">{{ plan.name }}<template v-if="order.kin !== null">（KIN{{ order.kin }}）</template></span>
            <span class="font-display text-[22px]" style="color: var(--gold-deep);">{{ formatYen(plan.price) }}<small class="ml-0.5 text-[12px]" style="color: var(--ink-soft);">{{ plan.id === 'subscription' ? '/月' : '' }}</small></span>
          </div>
          <div>
            <label class="formlabel" for="card-number">カード番号</label>
            <input id="card-number" v-model="card.number" class="formfield" inputmode="numeric" autocomplete="off" placeholder="4242 4242 4242 4242" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="formlabel" for="card-exp">有効期限</label>
              <input id="card-exp" v-model="card.exp" class="formfield" inputmode="numeric" autocomplete="off" placeholder="MM / YY" />
            </div>
            <div>
              <label class="formlabel" for="card-cvc">セキュリティコード</label>
              <input id="card-cvc" v-model="card.cvc" class="formfield" inputmode="numeric" autocomplete="off" placeholder="CVC" />
            </div>
          </div>
          <div>
            <label class="formlabel" for="card-name">カード名義</label>
            <input id="card-name" v-model="card.name" class="formfield" autocomplete="off" placeholder="TARO YAMADA" />
          </div>
          <p v-if="payError" class="notice">{{ payError }}</p>
          <button type="submit" class="btn-gold !mt-6 w-full" :disabled="paying">
            {{ paying ? '処理中…' : `${formatYen(plan.price)} を支払う` }}
          </button>
          <NuxtLink :to="cancelLink" class="btn-quiet w-full">キャンセルしてプラン選択へ戻る</NuxtLink>
        </form>
      </div>
    </div>
  </div>
</template>
