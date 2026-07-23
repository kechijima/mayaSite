<script setup lang="ts">
import { PLAN_RANK, PLAN_META, type MembershipPlan } from '~/composables/useMembership'

const route = useRoute()
const { plan, rank, setPlan } = useMembership()

const input = computed(() => ({
  name: (route.query.name as string) || 'ゲスト',
  birthdate: (route.query.birth as string) || '1992-10-16'
}))
const { result } = useDiagnosis(input)

const content = useDiagnosisContent(
  computed(() => result.value.sealIndex),
  computed(() => result.value.wavespellSealIndex),
  computed(() => result.value.toneIndex)
)
const sunText = computed(() => content.sunText.value ?? result.value.sun.text)
const wavespellText = computed(() => content.wavespellText.value ?? result.value.wavespell.text)
const toneText = computed(() => content.toneText.value ?? result.value.tone.text)

const displayBirthdate = computed(() => {
  const d = new Date(input.value.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const today = new Date()
const displayToday = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

// Progressive unlock: light → day sign, standard → +tresena, premium → +codex
const daySignUnlocked = computed(() => rank.value >= 1)
const tresenaUnlocked = computed(() => rank.value >= 2)
const codexUnlocked = computed(() => rank.value >= 3)

const chipClass = computed(() => ({
  free: 'border border-parchment-300/40 text-parchment-100',
  light: 'border border-gold-500 text-gold-300',
  standard: 'bg-gold-600 text-[#241a06]',
  premium: 'bg-gradient-to-r from-gold-500 to-gold-300 text-[#241a06]'
}[plan.value]))

// Only show plans that unlock something the visitor doesn't already have.
const remainingPlans = computed(() => PLAN_META.filter((p) => PLAN_RANK[p.id] > rank.value))
// Prefer recommending Standard while it's still an option; otherwise the next tier up.
const recommendedId = computed(() => {
  const standardAvailable = remainingPlans.value.some((p) => p.id === 'standard')
  return standardAvailable ? 'standard' : remainingPlans.value[0]?.id
})
const ctaLabel = computed(() => {
  const name = PLAN_META.find((p) => p.id === recommendedId.value)?.name
  return name ? `${name}プランで続きを見る` : '続きを見る'
})

const compendium = [
  { title: '年間運勢カレンダー', body: '月ごとの運気の波と、注意すべき時期を一年分カレンダー形式で解説します。' },
  { title: '相性診断 プレミアム解説（恋愛・仕事）', body: '無料の相性診断よりもさらに踏み込み、恋愛・仕事それぞれのシーンに合わせた詳細な関係性の解説をお届けします。' },
  { title: '開運アクションガイド', body: 'あなたの紋章・音に合わせた、日常に取り入れやすい具体的な開運行動を提案します。' },
  { title: '前世・来世の資質', body: '紋章の並びから読み解く、あなたが引き継いできた資質と課題について。' }
]

const demoPlans: { id: MembershipPlan; label: string }[] = [
  { id: 'free', label: '無料' },
  { id: 'light', label: 'ライト' },
  { id: 'standard', label: 'スタンダード' },
  { id: 'premium', label: 'プレミアム' }
]
</script>

<template>
  <div class="min-h-screen bg-ink-950 bg-pinstripe font-body text-parchment-100 pb-24">
    <div class="mx-auto flex max-w-[720px] items-center justify-between border-b border-gold-500/30 px-5 py-3.5 text-xs tracking-[.04em] text-parchment-300">
      <span>マヤ暦占い ドリームスペル診断</span>
      <span class="rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[.08em]" :class="chipClass">
        {{ plan.toUpperCase() }}
      </span>
    </div>

    <div class="px-5 pb-7 pt-11 text-center">
      <span class="font-body font-eyebrow-italic mb-1 block text-[16px] text-gold-300">Maya Sacred Calendar</span>
      <h1 class="text-balance font-display text-[clamp(30px,6vw,42px)] tracking-[.06em] [text-shadow:0_0_24px_rgba(248,200,113,0.2)]">
        あなたの本質と運勢
      </h1>
      <p class="mt-2.5 text-sm text-parchment-300">古代マヤの暦「ツォルキン」があなたの生年月日から読み解く、本当のあなた。</p>
    </div>

    <div class="mx-auto max-w-[720px] px-5">
      <dl class="mb-2 grid grid-cols-2 gap-3.5 rounded border border-gold-500/30 bg-white/[.02] px-6 py-4.5 sm:grid-cols-4">
        <div><dt class="mb-1 text-[10px] tracking-[.1em] text-parchment-300">お名前</dt><dd class="text-sm font-semibold">{{ result.name }} 様</dd></div>
        <div><dt class="mb-1 text-[10px] tracking-[.1em] text-parchment-300">生年月日</dt><dd class="text-sm font-semibold">{{ displayBirthdate }}</dd></div>
        <div><dt class="mb-1 text-[10px] tracking-[.1em] text-parchment-300">診断日</dt><dd class="text-sm font-semibold">{{ displayToday }}</dd></div>
        <div><dt class="mb-1 text-[10px] tracking-[.1em] text-parchment-300">KIN番号</dt><dd class="text-sm font-semibold text-gold-300 tabular-nums">KIN {{ result.kin }}</dd></div>
      </dl>

      <!-- ドリームスペル暦 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="ドリームスペル暦" eyebrow="Dreamspell Calendar" />
        <p class="mx-auto mb-1 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          マヤ暦は260日を1サイクルとする神聖暦「ツォルキン」がもとになっています。あなたの生年月日は260通りの「KIN」のひとつに対応し、そこに刻まれた紋章と音から、生まれ持った資質と巡る運気がわかります。
        </p>
        <KinBadge :kin="result.kin" />
      </section>

      <!-- 太陽の紋章 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="太陽の紋章" eyebrow="Sun Sign" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          太陽の紋章は、あなたの顕在意識——つまり周囲から見えている「本質」と「表の性格」を映し出します。
        </p>
        <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
          <MayaGlyph :seal-index="result.sealIndex" />
          <div>
            <h3 class="font-display text-[19px]">{{ result.sun.seal.name }}</h3>
            <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.sun.seal.english }} ｜ {{ result.sun.seal.keyword }}</span>
            <p class="text-[14.5px] leading-[1.9] opacity-90">{{ sunText }}</p>
          </div>
        </div>
      </section>

      <!-- ウェイブスペル -->
      <section class="pb-2 pt-14">
        <SectionDivider label="ウェイブスペル" eyebrow="Wave Spell" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          ウェイブスペルは、あなたの潜在意識——まだ本人も気づいていない可能性や、生まれ持った才能の方向性を表します。
        </p>
        <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
          <MayaGlyph :seal-index="result.wavespellSealIndex" />
          <div>
            <h3 class="font-display text-[19px]">{{ result.wavespell.seal.name }}</h3>
            <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.wavespell.seal.english }} ｜ {{ result.wavespell.seal.keyword }}</span>
            <p class="text-[14.5px] leading-[1.9] opacity-90">{{ wavespellText }}</p>
          </div>
        </div>
      </section>

      <!-- 銀河の音 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="銀河の音" eyebrow="Galactic Tone" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          銀河の音は、260日のツォルキン暦を13日ごとに巡る周期のリズムを表し、あなたが力を発揮しやすいテンポを示します。
        </p>
        <div class="text-center">
          <h3 class="font-display text-[19px]">{{ result.tone.info.name }}</h3>
          <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.tone.info.english }} ｜ {{ result.tone.info.keyword }}</span>
          <p class="mx-auto max-w-[560px] text-[14.5px] leading-[1.9] opacity-90">{{ toneText }}</p>
        </div>
      </section>

      <!-- デイサイン: unlocked from ライト -->
      <section class="pb-2 pt-14">
        <SectionDivider label="デイサイン" eyebrow="Day Sign" />
        <template v-if="daySignUnlocked">
          <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
            デイサインは、あなたが力を発揮しやすい行動パターンと、磨いていくと良い才能を示します。
          </p>
          <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
            <MayaGlyph :seal-index="result.occultSealIndex" />
            <div>
              <h3 class="font-display text-[19px]">{{ result.daysign.seal.name }}</h3>
              <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.daysign.seal.english }} ｜ {{ result.daysign.seal.keyword }}</span>
              <p class="text-[14.5px] leading-[1.9] opacity-90">{{ result.daysign.text }}</p>
            </div>
          </div>
        </template>
        <LockedVeil v-else label="デイサインはライトプラン以上でご覧いただけます">
          <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
            <MayaGlyph :seal-index="result.occultSealIndex" />
            <div>
              <h3 class="font-display text-[19px]">{{ result.daysign.seal.name }}</h3>
              <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">才能・行動パターン・磨くべき力</span>
              <p class="text-[14.5px] leading-[1.9] opacity-90">{{ result.daysign.text }}</p>
            </div>
          </div>
        </LockedVeil>
      </section>

      <!-- トレセーナ: unlocked from スタンダード -->
      <section class="pb-2 pt-14">
        <SectionDivider label="トレセーナ" eyebrow="Tresena" />
        <template v-if="tresenaUnlocked">
          <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
            トレセーナは13日を1区切りとする運気の波です。現在の周期を把握することで、日々の判断のタイミングが見えてきます。
          </p>
          <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
            <MayaGlyph :seal-index="result.currentWavespellSealIndex" />
            <div>
              <h3 class="font-display text-[19px]">{{ result.tresena.seal.name }} ｜ 現在の周期（{{ result.tresena.dayInCycle }}日目）</h3>
              <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.tresena.tone.name }} ｜ {{ result.tresena.tone.keyword }}</span>
              <p class="text-[14.5px] leading-[1.9] opacity-90">{{ result.tresena.text }}</p>
            </div>
          </div>
        </template>
        <LockedVeil v-else label="トレセーナはスタンダードプラン以上でご覧いただけます">
          <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
            <MayaGlyph :seal-index="result.currentWavespellSealIndex" />
            <div>
              <h3 class="font-display text-[19px]">{{ result.tresena.seal.name }}</h3>
              <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">13日間の運気周期・現在の巡り</span>
              <p class="text-[14.5px] leading-[1.9] opacity-90">{{ result.tresena.text }}</p>
            </div>
          </div>
        </LockedVeil>
      </section>

      <!-- 古代マヤ暦全書: unlocked at プレミアム -->
      <section class="pb-2 pt-14">
        <SectionDivider label="古代マヤ暦全書" eyebrow="Ancient Maya Codex" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          {{ codexUnlocked
            ? '年間の運気カレンダーから相性診断まで、あなたをより深く読み解きます。'
            : 'プレミアムプラン限定。年間の運気カレンダーから相性診断まで、より深くあなたを読み解きます。' }}
        </p>

        <template v-if="codexUnlocked">
          <div class="mb-6.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div v-for="c in compendium" :key="c.title" class="rounded border border-gold-500/30 p-4">
              <h4 class="mb-2 font-display text-[15.5px] text-gold-300">{{ c.title }}</h4>
              <p class="text-[13px] leading-[1.8] text-parchment-300">{{ c.body }}</p>
            </div>
          </div>
          <div class="rounded border border-gold-500/30 bg-white/[.02] p-5">
            <h2 class="mb-4 text-[14.5px] font-bold text-gold-300">2026年 運勢カレンダー（抜粋）</h2>
            <div class="flex justify-between border-b border-dashed border-gold-500/30 py-1.5 text-[13px]"><span>7月</span><b class="font-semibold text-gold-300">手放し・整理の月</b></div>
            <div class="flex justify-between border-b border-dashed border-gold-500/30 py-1.5 text-[13px]"><span>8月</span><b class="font-semibold text-gold-300">人との縁が広がる月</b></div>
            <div class="flex justify-between border-b border-dashed border-gold-500/30 py-1.5 text-[13px]"><span>9月</span><b class="font-semibold text-gold-300">決断と行動の月</b></div>
            <div class="flex justify-between py-1.5 text-[13px]"><span>10月</span><b class="font-semibold text-gold-300">成果が形になる月</b></div>
          </div>

          <div class="mt-6.5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button class="w-full rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-100 sm:w-auto" @click="setPlan('free')">
              無料版の見え方を確認する（デモ切替）
            </button>
            <NuxtLink to="/account" class="w-full rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-100 sm:w-auto">
              契約状況・解約はこちら
            </NuxtLink>
          </div>
        </template>

        <template v-else>
          <LockedVeil label="古代マヤ暦全書はプレミアムプラン以上でご覧いただけます">
            <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div v-for="c in compendium" :key="c.title" class="rounded border border-gold-500/30 p-4">
                <h4 class="mb-2 font-display text-[15.5px] text-gold-300">{{ c.title }}</h4>
                <p class="text-[13px] leading-[1.8] text-parchment-300">{{ c.body }}</p>
              </div>
            </div>
          </LockedVeil>

          <div class="mt-4.5 rounded border border-gold-500 bg-gradient-to-br from-gold-500/[.08] to-ink-950/40 p-7.5 text-center">
            <div class="mb-2 text-balance font-display text-[21px]">
              {{ plan === 'free' ? '古代マヤ暦全書で、あなたをもっと深く' : 'さらに深く、あなたを読み解く' }}
            </div>
            <p class="mb-5.5 text-[13.5px] text-parchment-300">
              {{ plan === 'free'
                ? 'デイサイン・トレセーナ・年間運勢・相性診断まで、すべての項目を今すぐ閲覧できます。'
                : `残りは「${remainingPlans.map(p => p.name).join('」「')}」プランでご覧いただけます。` }}
            </p>
            <div class="mb-5.5 grid grid-cols-1 gap-3" :class="remainingPlans.length === 3 ? 'sm:grid-cols-3' : remainingPlans.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-1 sm:max-w-[220px] sm:mx-auto'">
              <div v-for="p in remainingPlans" :key="p.id" class="rounded border p-4" :class="p.id === recommendedId ? 'border-gold-500 bg-gold-500/[.06]' : 'border-gold-500/30'">
                <div class="mb-1.5 text-[11.5px] tracking-[.08em] text-gold-300">{{ p.name }}</div>
                <div class="font-display text-[22px]">{{ p.price }}<small class="text-[11px] font-normal text-parchment-300">/月</small></div>
                <div class="mt-1 text-[11.5px] text-parchment-300">{{ p.desc }}</div>
              </div>
            </div>
            <NuxtLink to="/checkout" class="inline-block rounded-full bg-gradient-to-r from-gold-500 to-gold-300 px-9.5 py-3.5 text-[14.5px] font-bold tracking-[.03em] text-[#241a06]">
              {{ ctaLabel }}
            </NuxtLink>
          </div>
        </template>
      </section>

      <!-- 相性診断への導線: 無料機能、ゲート無し -->
      <section class="pb-2 pt-14">
        <div class="rounded border border-gold-500/30 bg-white/[.02] p-5 text-center">
          <div class="mb-2 font-display text-[17px] text-gold-300">身近な人との相性を無料で診断</div>
          <p class="mb-4 text-[13px] text-parchment-300">パートナーや友人の生年月日を入れるだけで、紋章の組み合わせから相性を読み解きます。</p>
          <NuxtLink
            :to="{ path: '/compatibility', query: { name: result.name, birth: input.birthdate } }"
            class="inline-block rounded-full border border-gold-500/50 px-6.5 py-2.5 text-[13.5px] font-semibold text-gold-300"
          >
            相性診断をはじめる
          </NuxtLink>
        </div>
      </section>

      <p class="pt-11 text-center text-xs text-parchment-300/70">
        古代4000年の智慧 マヤ暦占い ｜ {{ plan === 'premium' ? 'プレミアム会員としてご利用中です' : plan === 'free' ? '監修者紹介・占術紹介・利用規約はフッターメニューより' : `${PLAN_META.find(p => p.id === plan)?.name}会員としてご利用中です` }}
      </p>
    </div>

    <!-- Demo-only membership toggle: no real auth/payment is wired up, this simulates it. -->
    <div class="fixed inset-x-4 bottom-4 z-40 flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-gold-500/40 bg-ink-900/90 px-3 py-2 text-xs text-parchment-300 shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:flex-nowrap sm:justify-start sm:rounded-full">
      <span class="whitespace-nowrap">検証用：</span>
      <button
        v-for="d in demoPlans"
        :key="d.id"
        class="whitespace-nowrap rounded-full px-2.5 py-1 font-semibold"
        :class="plan === d.id ? (d.id === 'free' ? 'bg-parchment-100 text-ink-950' : 'bg-gradient-to-r from-gold-500 to-gold-300 text-[#241a06]') : 'text-parchment-300'"
        @click="setPlan(d.id)"
      >{{ d.label }}</button>
    </div>
  </div>
</template>
