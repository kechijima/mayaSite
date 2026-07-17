<script setup lang="ts">
import { PLAN_META, type MembershipPlan } from '~/composables/useMembership'

const { setPlan } = useMembership()
const router = useRouter()

const selected = ref<MembershipPlan>('standard')
const submitting = ref(false)
const plans = PLAN_META

function pay() {
  submitting.value = true
  // Example checkout only — no real Stripe integration. In production this
  // would redirect to Stripe Checkout and plan status would be set by a
  // webhook once payment succeeds, not directly on the client like this.
  setTimeout(() => {
    setPlan(selected.value)
    router.push('/result')
  }, 700)
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-10 font-body text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="mx-auto max-w-[440px]">
      <div class="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-center text-[12.5px] text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
        これはデモ決済画面です。実際の課金は発生しません（Stripe Checkout の実装例）。
      </div>

      <h1 class="mb-1 text-lg font-bold">マヤ暦占い 有料プラン</h1>
      <p class="mb-6 text-sm text-slate-500 dark:text-slate-400">お好きなプランを選んでお申し込みください。</p>

      <div class="mb-6 space-y-2.5">
        <label
          v-for="p in plans"
          :key="p.id"
          class="flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3.5"
          :class="selected === p.id ? 'border-brass-700 bg-brass-700/5 ring-1 ring-brass-700' : 'border-slate-200 dark:border-slate-800'"
        >
          <div class="flex items-center gap-3">
            <input v-model="selected" type="radio" :value="p.id" name="plan" class="accent-brass-700" />
            <div>
              <div class="text-sm font-semibold">{{ p.name }}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">{{ p.desc }}</div>
            </div>
          </div>
          <div class="text-sm font-bold tabular-nums">{{ p.price }}<span class="font-normal text-slate-400">/月</span></div>
        </label>
      </div>

      <div class="mb-6 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div>
          <label class="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">カード番号</label>
          <input type="text" placeholder="4242 4242 4242 4242" disabled class="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900" />
        </div>
        <div class="flex gap-3">
          <div class="flex-1">
            <label class="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">有効期限</label>
            <input type="text" placeholder="MM / YY" disabled class="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900" />
          </div>
          <div class="flex-1">
            <label class="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">CVC</label>
            <input type="text" placeholder="123" disabled class="w-full rounded border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900" />
          </div>
        </div>
      </div>

      <button
        class="w-full rounded-lg bg-brass-700 py-3 text-sm font-bold text-white disabled:opacity-60"
        :disabled="submitting"
        @click="pay"
      >
        {{ submitting ? '処理中…' : 'お申し込みを確定する' }}
      </button>

      <NuxtLink to="/result" class="mt-4 block text-center text-xs text-slate-400 hover:underline">診断結果に戻る</NuxtLink>
    </div>
  </div>
</template>
