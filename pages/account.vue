<script setup lang="ts">
import { PLAN_META } from '~/composables/useMembership'

const { plan, setPlan } = useMembership()

const currentPlan = computed(() => PLAN_META.find((p) => p.id === plan.value))

const nextBillingDate = computed(() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const paymentMethod = 'Visa •••• 4242'

type CancelStep = 'idle' | 'confirm' | 'done'
const cancelStep = ref<CancelStep>('idle')

function startCancel() {
  cancelStep.value = 'confirm'
}
function abortCancel() {
  cancelStep.value = 'idle'
}
function confirmCancel() {
  setPlan('free')
  cancelStep.value = 'done'
}
</script>

<template>
  <div class="min-h-screen bg-ink-950 bg-pinstripe font-body text-parchment-100">
    <div class="mx-auto max-w-[560px] px-5 pb-24 pt-14">
      <span class="font-body font-eyebrow-italic mb-1 block text-center text-[16px] text-gold-300">My Account</span>
      <h1 class="text-balance text-center font-display text-[clamp(26px,5vw,34px)] tracking-[.06em]">契約状況・解約</h1>

      <div class="mt-4.5 rounded-lg border border-amber-500/40 bg-amber-500/[.06] px-4 py-2.5 text-center text-[12.5px] text-gold-300">
        これはデモ画面です。実際の解約処理やStripeカスタマーポータルとの連携は行われません。
      </div>

      <!-- Cancel done -->
      <div v-if="cancelStep === 'done'" class="mt-9 rounded border border-gold-500/30 bg-white/[.02] p-7.5 text-center">
        <div class="mb-2 font-display text-[19px] text-gold-300">解約手続きが完了しました</div>
        <p class="mb-5.5 text-[13.5px] leading-[1.8] text-parchment-300">ご利用ありがとうございました。またのご利用をお待ちしております。</p>
        <NuxtLink to="/result" class="inline-block rounded-full border border-gold-500/50 px-6.5 py-2.5 text-[13.5px] font-semibold text-gold-300">
          診断結果に戻る
        </NuxtLink>
      </div>

      <!-- Not subscribed -->
      <div v-else-if="plan === 'free'" class="mt-9 rounded border border-gold-500/30 bg-white/[.02] p-7.5 text-center">
        <p class="mb-5.5 text-[14.5px] leading-[1.9] text-parchment-300">現在ご契約中の有料プランはありません。</p>
        <NuxtLink to="/checkout" class="inline-block rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-9.5 py-3.5 text-[14.5px] font-bold tracking-[.03em] text-[#241a06]">
          プランを見る
        </NuxtLink>
      </div>

      <!-- Subscribed -->
      <template v-else>
        <div class="mt-9 rounded border border-gold-500/30 bg-white/[.02] p-6">
          <div class="mb-5 flex items-center justify-between border-b border-gold-500/20 pb-5">
            <div>
              <div class="text-[11px] tracking-[.1em] text-parchment-300">ご契約中のプラン</div>
              <div class="font-display text-[24px] text-gold-300">{{ currentPlan?.name }}</div>
            </div>
            <div class="text-right">
              <div class="font-display text-[20px]">{{ currentPlan?.price }}<span class="text-[12px] font-body font-normal text-parchment-300">/月</span></div>
            </div>
          </div>
          <dl class="grid grid-cols-2 gap-y-3 text-[13px]">
            <div><dt class="text-parchment-300">次回請求日</dt><dd class="font-semibold">{{ nextBillingDate }}</dd></div>
            <div><dt class="text-parchment-300">お支払い方法</dt><dd class="font-semibold">{{ paymentMethod }}</dd></div>
          </dl>
        </div>

        <div class="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <NuxtLink to="/checkout" class="w-full rounded-full border border-gold-500/50 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-gold-300 sm:w-auto">
            プランを変更する
          </NuxtLink>
          <button
            v-if="cancelStep === 'idle'"
            class="w-full rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-300 sm:w-auto"
            @click="startCancel"
          >
            解約する
          </button>
        </div>

        <!-- Cancel confirmation -->
        <div v-if="cancelStep === 'confirm'" class="mt-6.5 rounded border border-red-400/40 bg-red-500/[.06] p-6 text-center">
          <div class="mb-2 font-display text-[19px]">本当に解約しますか？</div>
          <p class="mb-5.5 text-[13.5px] leading-[1.8] text-parchment-300">
            解約すると、{{ currentPlan?.name }}プランでご覧いただいていた項目（{{ currentPlan?.desc }}）は閲覧できなくなります。
          </p>
          <div class="flex flex-col justify-center gap-2.5 sm:flex-row">
            <button class="w-full rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-100 sm:w-auto" @click="abortCancel">
              やめておく
            </button>
            <button class="w-full rounded-full bg-red-500/80 px-6.5 py-2.5 text-center text-[13.5px] font-bold text-white sm:w-auto" @click="confirmCancel">
              解約を確定する
            </button>
          </div>
        </div>
      </template>

      <p v-if="plan !== 'free'" class="mt-9 text-center text-xs text-parchment-300/70">
        <NuxtLink to="/result" class="hover:underline">診断結果に戻る</NuxtLink>
      </p>
    </div>
  </div>
</template>
