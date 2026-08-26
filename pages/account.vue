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
  <!-- 2026-08-17: 黒地に金(bg-ink-950)の独自配色から、他のユーザー向けページと同じ
       paper(羊皮紙)配色へ統一。共通ヘッダー追加にあわせて、ヘッダーだけ浮いて見えないように。 -->
  <div class="paper-page min-h-screen">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MY ACCOUNT</span>
        <h1 class="font-display masthead__title">契約状況・解約</h1>
      </div>

      <div class="mx-auto max-w-[560px]">
        <p class="notice">契約状況・解約の機能は現在準備中です。公開までしばらくお待ちください。</p>

        <!-- 解約完了 -->
        <div v-if="cancelStep === 'done'" class="panel mt-6 text-center">
          <div class="mb-2 font-display text-[19px]" style="color: var(--gold-deep);">解約手続きが完了しました</div>
          <p class="mb-5.5 text-[13.5px] leading-[1.8]" style="color: var(--ink-soft);">ご利用ありがとうございました。またのご利用をお待ちしております。</p>
          <NuxtLink to="/" class="btn-outline">トップへ戻る</NuxtLink>
        </div>

        <!-- 未契約 -->
        <div v-else-if="plan === 'free'" class="panel mt-6 text-center">
          <p class="mb-5.5 text-[14.5px] leading-[1.9]" style="color: var(--ink-soft);">現在ご契約中の有料プランはありません。</p>
          <NuxtLink to="/checkout" class="btn-gold">プランを見る</NuxtLink>
        </div>

        <!-- 契約中 -->
        <template v-else>
          <div class="panel mt-6">
            <div class="mb-5 flex items-center justify-between pb-5" style="border-bottom: 1px solid var(--gold-line-soft);">
              <div>
                <div class="text-[11px] tracking-[.1em]" style="color: var(--ink-faint);">ご契約中のプラン</div>
                <div class="font-display text-[24px]" style="color: var(--gold-deep);">{{ currentPlan?.name }}</div>
              </div>
              <div class="text-right">
                <div class="font-display text-[20px]">
                  {{ currentPlan?.price }}<span class="text-[12px] font-normal" style="color: var(--ink-faint);">/月</span>
                </div>
              </div>
            </div>
            <dl class="grid grid-cols-2 gap-y-3 text-[13px]">
              <div>
                <dt style="color: var(--ink-faint);">次回請求日</dt>
                <dd class="font-semibold">{{ nextBillingDate }}</dd>
              </div>
              <div>
                <dt style="color: var(--ink-faint);">お支払い方法</dt>
                <dd class="font-semibold">{{ paymentMethod }}</dd>
              </div>
            </dl>
          </div>

          <div class="mt-4 flex flex-col gap-2.5 sm:flex-row">
            <NuxtLink to="/checkout" class="btn-outline w-full sm:w-auto">プランを変更する</NuxtLink>
            <button v-if="cancelStep === 'idle'" type="button" class="btn-quiet w-full sm:w-auto" @click="startCancel">
              解約する
            </button>
          </div>

          <!-- 解約確認 -->
          <div v-if="cancelStep === 'confirm'" class="panel panel--danger mt-6.5 text-center">
            <div class="mb-2 font-display text-[19px]">本当に解約しますか？</div>
            <p class="mb-5.5 text-[13.5px] leading-[1.8]" style="color: var(--ink-soft);">
              解約すると、{{ currentPlan?.name }}でご覧いただいていた項目（{{ currentPlan?.desc }}）は閲覧できなくなります。
            </p>
            <div class="flex flex-col justify-center gap-2.5 sm:flex-row">
              <button type="button" class="btn-quiet w-full sm:w-auto" @click="abortCancel">やめておく</button>
              <button type="button" class="btn-danger w-full sm:w-auto" @click="confirmCancel">解約を確定する</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
