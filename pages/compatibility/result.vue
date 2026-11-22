<script setup lang="ts">
import { explainedText, explainedLabel, type PersonProfile } from '~/composables/useCompatibility'
import { decodePeople } from '~/utils/compatibilityQuery'

// 相性診断の結果。入力は /compatibility で行い、全員ぶんを `p` クエリで受け取る
// (utils/compatibilityQuery.ts)。2026-11-19 にフォームと同じページから分けた。
const route = useRoute()
const decoded = computed(() => decodePeople(route.query.p))

// クエリが壊れている・直接開いた場合は入力画面へ戻す
watchEffect(() => {
  if (!decoded.value) navigateTo('/compatibility', { replace: true })
})

const input = computed(() => decoded.value ?? { self: { id: 'self', name: '', birthdate: '2000-01-01', gender: 'female' as const }, others: [] })
const { result } = useCompatibility(input)

// 文中の呼び方。自分は「あなた」、相手は「○○さん」
function who(p: PersonProfile) {
  return p.id === 'self' ? 'あなた' : `${p.name}さん`
}

function back() {
  // フォームから来たなら履歴を戻る(入力は useState に残っている)。URL を直接開いた場合は履歴が無いので遷移
  if (window.history.state?.back === '/compatibility') useRouter().back()
  else navigateTo('/compatibility')
}
</script>

<template>
  <div v-if="decoded" class="paper-page paper-page--header min-h-screen">
    <IconSprite />

    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">Compatibility Reading</span>
        <h1 class="font-display masthead__title">相性診断</h1>
        <p class="masthead__sub">紋章の組み合わせから、あなたと大切な人との相性を読み解きます。</p>
      </div>

      <section class="section">
        <SectionDivider label="参加者" eyebrow="Participants" />
        <!-- 2026-11-22 要望: 2列をやめて1人1枚を横幅いっぱいに(胸像を大きく出すため。mayadan.jp と同じ) -->
        <div class="mx-auto grid max-w-[820px] grid-cols-1 gap-6">
          <PersonProfileCard :profile="result.self" />
          <PersonProfileCard v-for="p in result.others" :key="p.id" :profile="p" />
        </div>
      </section>

      <!-- 相性: 参加者全員の全組み合わせを、1つの関係につき1文で並べる(2026-11-19 要望: カードをやめて文章のみ)。
           両方向の関係と運命数字はまとめて1文にする(composables/useCompatibility.ts の statements)。
           関係の判定は mayadan.jp の相性診断に合わせている(utils/compatibility.ts)。 -->
      <section class="section">
        <SectionDivider label="相性" eyebrow="Compatibility" />
        <div class="compatlines mx-auto max-w-[420px] sm:max-w-[820px]">
          <ul v-for="pair in result.pairs" :key="pair.key" class="compatlines__pair">
            <li v-for="st in pair.statements" :key="st.key">
              KIN{{ pair.a.kin }}の{{ who(pair.a) }}とKIN{{ pair.b.kin }}の{{ who(pair.b) }}は<strong :class="{ 'is-danger': st.danger }">{{ st.label }}</strong>
            </li>
            <li v-if="!pair.statements.length" class="is-none">
              KIN{{ pair.a.kin }}の{{ who(pair.a) }}とKIN{{ pair.b.kin }}の{{ who(pair.b) }}には、当てはまる関係はありませんでした
            </li>
          </ul>
        </div>
      </section>

      <!-- 結果に出てきた関係の説明を1回ずつ。 -->
      <section v-if="result.relationTypes.length" class="section">
        <SectionDivider label="関係の説明" eyebrow="Guide" />
        <dl class="mx-auto max-w-[420px] space-y-3 sm:max-w-[820px]">
          <div v-for="t in result.relationTypes" :key="t" class="rounded-lg px-4 py-3.5" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel);">
            <dt class="mb-1 text-[13px] font-bold" :style="{ color: t === 'absoluteOpposite' ? 'var(--seal-red)' : 'var(--gold-deep)' }">{{ explainedLabel(t) }}</dt>
            <dd class="text-[12.5px] leading-[1.8]" style="color: var(--ink-soft);">{{ explainedText(t) }}</dd>
          </div>
        </dl>
      </section>

      <div class="mt-8 flex justify-center">
        <button
          type="button"
          class="rounded-full px-6.5 py-2.5 text-center text-[13.5px] font-semibold"
          style="border: 1px solid var(--gold-line); color: var(--ink-soft);"
          @click="back"
        >
          入力内容を変えて診断する
        </button>
      </div>
    </div>
  </div>
</template>
