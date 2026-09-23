<script setup lang="ts">
import { PLANS, buildPlansLink, buildSuccessLink, formatYen, isValidOrder, readCheckoutParams } from '~/utils/checkout'

// 【仮の決済画面】Stripe がホストする Checkout ページの置き換え。決済導入後は Stripe の
// ページそのものに遷移するので、このファイルは削除する(utils/checkout.ts のコメント参照)。
// カード入力欄は見た目だけで、何も検証せず、どこにも送らない。
//   支払う      → /checkout/success(Stripe の success_url 相当)
//   キャンセル  → /plans?canceled=1(Stripe の cancel_url 相当)
const route = useRoute()
const { user, ready } = useAuth()
const { withLoading } = useGlobalLoading()

const params = computed(() => readCheckoutParams(route.query))
const order = computed(() => (isValidOrder(params.value) ? params.value : null))
const plan = computed(() => (order.value ? PLANS[order.value.plan] : null))
const cancelLink = computed(() => buildPlansLink(params.value.kin, params.value.redirect, true))

const card = reactive({ number: '', exp: '', cvc: '', name: '' })
const paying = ref(false)

async function pay() {
  if (!order.value || paying.value) return
  paying.value = true
  try {
    // 決済処理っぽい待ち時間だけ真似る(本物は Stripe 側で完結し、ここには戻ってこない)
    await withLoading(() => new Promise((resolve) => setTimeout(resolve, 900)))
    await navigateTo(buildSuccessLink(order.value))
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
      </div>

      <!-- この画面には「準備中」の断り書きを出さない(2026-09-23 要望)。本物の決済画面に
           近い見た目で確認したいため。仮であることはファイル冒頭のコメントに書いてある。 -->
      <div class="mx-auto mt-8 max-w-[480px] space-y-4">
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
          <button type="submit" class="btn-gold !mt-6 w-full" :disabled="paying">
            {{ paying ? '処理中…' : `${formatYen(plan.price)} を支払う` }}
          </button>
          <NuxtLink :to="cancelLink" class="btn-quiet w-full">キャンセルしてプラン選択へ戻る</NuxtLink>
        </form>
      </div>
    </div>
  </div>
</template>
