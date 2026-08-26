<script setup lang="ts">
import { PLAN_META } from '~/composables/useMembership'

const { setPlan } = useMembership()
const router = useRouter()

const submitting = ref(false)
// 唯一の有料プラン — free/paidの2択になったため選択UIは不要(以前はライト/スタンダード/
// プレミアムのラジオ選択だった)。
const plan = PLAN_META[0]

function pay() {
  submitting.value = true
  // Example checkout only — no real Stripe integration. In production this
  // would redirect to Stripe Checkout and plan status would be set by a
  // webhook once payment succeeds, not directly on the client like this.
  setTimeout(() => {
    setPlan(plan.id)
    router.push('/result')
  }, 700)
}
</script>

<template>
  <!-- 2026-08-17: slate系の明るい独自配色(+ダークモード対応)から、他のユーザー向けページと
       同じ paper(羊皮紙)配色へ統一。共通ヘッダー追加にあわせて、ヘッダーだけ浮いて見えない
       ように。darkModeはmedia指定なので、OSがダークでも配色が切り替わらないよう
       Tailwindのdark:ユーティリティは使っていない。 -->
  <div class="paper-page min-h-screen">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">SUBSCRIPTION</span>
        <h1 class="font-display masthead__title">有料プランのお申し込み</h1>
        <p class="masthead__sub">お申し込みいただくと、有料エリアの内容まですべてご覧いただけます。</p>
      </div>

      <div class="mx-auto max-w-[440px]">
        <p class="notice">お申し込み機能は現在準備中です。公開までしばらくお待ちください。</p>

        <div class="panel panel--plan mt-6 flex items-center justify-between">
          <div>
            <div class="font-display text-[17px]" style="color: var(--gold-deep);">{{ plan.name }}</div>
            <div class="mt-0.5 text-[12px]" style="color: var(--ink-soft);">{{ plan.desc }}</div>
          </div>
          <div class="font-display text-[19px] tabular-nums whitespace-nowrap">
            {{ plan.price }}<span class="text-[12px] font-normal" style="color: var(--ink-faint);">/月</span>
          </div>
        </div>

        <div class="panel mt-4 space-y-3.5">
          <div>
            <label class="formlabel">カード番号</label>
            <input type="text" placeholder="4242 4242 4242 4242" disabled class="formfield" />
          </div>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="formlabel">有効期限</label>
              <input type="text" placeholder="MM / YY" disabled class="formfield" />
            </div>
            <div class="flex-1">
              <label class="formlabel">CVC</label>
              <input type="text" placeholder="123" disabled class="formfield" />
            </div>
          </div>
        </div>

        <button type="button" class="btn-gold mt-6 w-full" :disabled="submitting" @click="pay">
          {{ submitting ? '処理中…' : 'お申し込みを確定する' }}
        </button>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
