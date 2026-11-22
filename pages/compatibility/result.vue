<script setup lang="ts">
import type { PersonProfile } from '~/composables/useCompatibility'
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

      <!-- 相性: 参加者全員の全組み合わせを、見出し・枠なしの文章で参加者の上に並べる(2026-11-22 要望)。
           文言と並び順は mayadan.jp の結果に合わせる(2026-11-22 要望):
           「KIN7のあなた（赤い竜）から見てKIN138のAさん（青い猿）は反対KINです。」
           行は composables/useCompatibility.ts の lineGroups(見る側の人ごと)。関係の判定は utils/compatibility.ts。 -->
      <div class="compattext">
        <p v-for="g in result.lineGroups" :key="g.from.id" class="compattext__pair">
          <!-- 「KIN○の」「○○さん」「（紋章名）」それぞれの中では折り返さない(スマホで紋章名や名前の途中で切れないように。
               まとめて折り返し禁止にすると、長い名前と長い紋章名の組み合わせで画面からはみ出すので3つに分ける) -->
          <span v-for="l in g.lines" :key="l.key" class="compattext__line"><span class="nw">KIN{{ l.from.kin }}の</span><span class="nw">{{ who(l.from) }}</span><span class="nw">（{{ l.fromSealName }}）</span>から見て<span class="nw">KIN{{ l.to.kin }}の</span><span class="nw">{{ who(l.to) }}</span><span class="nw">（{{ l.toSealName }}）</span>は<strong :class="{ 'is-danger': l.danger }">{{ l.label }}</strong>です。</span>
        </p>
        <p v-if="result.destinyLines.length" class="compattext__pair">
          <span v-for="d in result.destinyLines" :key="d.key" class="compattext__line">KIN{{ d.a.kin }}の{{ who(d.a) }}とKIN{{ d.b.kin }}の{{ who(d.b) }}は<strong>{{ d.label }}</strong>です。</span>
        </p>
        <p v-if="result.unrelatedPairs.length" class="compattext__pair">
          <span v-for="u in result.unrelatedPairs" :key="u.key" class="compattext__line is-none">KIN{{ u.a.kin }}の{{ who(u.a) }}とKIN{{ u.b.kin }}の{{ who(u.b) }}には、当てはまる関係はありませんでした。</span>
        </p>
      </div>

      <section class="section">
        <SectionDivider label="参加者" eyebrow="Participants" />
        <!-- 2026-11-22 要望: 2列をやめて1人1枚を横幅いっぱいに(胸像を大きく出すため。mayadan.jp と同じ) -->
        <div class="mx-auto grid max-w-[820px] grid-cols-1 gap-6">
          <PersonProfileCard :profile="result.self" />
          <PersonProfileCard v-for="p in result.others" :key="p.id" :profile="p" />
        </div>
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
