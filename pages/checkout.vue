<script setup lang="ts">
import { PLAN_META } from '~/composables/useMembership'
import { DEFAULT_GENDER, isGender, type Gender } from '~/utils/gender'

const plan = PLAN_META[0]
const route = useRoute()
const { submitContactRequest } = useContactRequests()

const genderQuery = route.query.gender as string | undefined
const name = ref((route.query.name as string) || '')
const gender = ref<Gender>(genderQuery && isGender(genderQuery) ? genderQuery : DEFAULT_GENDER)
const phone = ref('')
const email = ref('')

type Step = 'form' | 'submitting' | 'done' | 'error'
const step = ref<Step>('form')

const canSubmit = computed(() => name.value.trim() && phone.value.trim() && email.value.trim())

async function submit() {
  if (!canSubmit.value) return
  step.value = 'submitting'
  try {
    await submitContactRequest({ name: name.value.trim(), gender: gender.value, phone: phone.value.trim(), email: email.value.trim() })
    step.value = 'done'
  } catch (e) {
    console.error(e)
    step.value = 'error'
  }
}
</script>

<template>
  <!-- 2026-08-17: slate系の明るい独自配色(+ダークモード対応)から、他のユーザー向けページと
       同じ paper(羊皮紙)配色へ統一。共通ヘッダー追加にあわせて、ヘッダーだけ浮いて見えない
       ように。darkModeはmedia指定なので、OSがダークでも配色が切り替わらないよう
       Tailwindのdark:ユーティリティは使っていない。
       2026-08-26: 決済(Stripe等)が未実装のため、カード入力欄はやめて連絡先を預かるフォームに
       変更。送信後は「実装が整い次第連絡する」旨を案内するのみで、その場でのプラン付与は
       行わない(以前のpay()は setTimeout の後 setPlan() する完全な見せかけだった)。 -->
  <div class="paper-page min-h-screen">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">SUBSCRIPTION</span>
        <h1 class="font-display masthead__title">有料プランのお申し込み</h1>
        <p class="masthead__sub">お申し込みいただくと、有料エリアの内容まですべてご覧いただけます。</p>
      </div>

      <div class="mx-auto max-w-[440px]">
        <p class="notice">オンライン決済は現在準備中です。下記に連絡先をご入力いただくと、ご利用いただけるようになり次第、担当より個別にご連絡いたします。</p>

        <div class="panel panel--plan mt-6 flex items-center justify-between">
          <div>
            <div class="font-display text-[17px]" style="color: var(--gold-deep);">{{ plan.name }}</div>
            <div class="mt-0.5 text-[12px]" style="color: var(--ink-soft);">{{ plan.desc }}</div>
          </div>
          <div class="font-display text-[19px] tabular-nums whitespace-nowrap">
            {{ plan.price }}<span class="text-[12px] font-normal" style="color: var(--ink-faint);">/月</span>
          </div>
        </div>

        <!-- 送信完了 -->
        <div v-if="step === 'done'" class="panel mt-4 text-center">
          <div class="mb-2 font-display text-[17px]" style="color: var(--gold-deep);">お申し込みを受け付けました</div>
          <p class="text-[13.5px] leading-[1.8]" style="color: var(--ink-soft);">
            ご連絡先を確かに承りました。決済機能の実装が整い次第、ご入力いただいた連絡先まで担当よりご連絡いたします。今しばらくお待ちください。
          </p>
          <NuxtLink to="/result" class="btn-outline mt-5 inline-block">結果ページへ戻る</NuxtLink>
        </div>

        <!-- 未送信 / エラー -->
        <form v-else class="mt-4" @submit.prevent="submit">
          <div v-if="step === 'error'" class="notice mb-4">送信に失敗しました。お手数ですが、時間をおいて再度お試しください。</div>

          <div class="panel space-y-3.5">
            <div>
              <label class="formlabel">お名前</label>
              <input v-model="name" type="text" placeholder="結衣" required class="formfield" />
            </div>
            <div>
              <label class="formlabel">性別</label>
              <GenderRadio v-model="gender" />
            </div>
            <div>
              <label class="formlabel">電話番号</label>
              <input v-model="phone" type="tel" placeholder="090-1234-5678" required class="formfield" />
            </div>
            <div>
              <label class="formlabel">メールアドレス</label>
              <input v-model="email" type="email" placeholder="yui@example.com" required class="formfield" />
            </div>
          </div>

          <button type="submit" class="btn-gold mt-6 w-full" :disabled="!canSubmit || step === 'submitting'">
            {{ step === 'submitting' ? '送信中…' : '連絡先を送信する' }}
          </button>
        </form>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
