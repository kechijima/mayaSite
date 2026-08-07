<script setup lang="ts">
import { PLAN_META, type MembershipPlan } from '~/composables/useMembership'
import type { CharacterProfileFields } from '~/composables/useDiagnosisContent'
import { DEFAULT_GENDER, genderLabel, isGender } from '~/utils/gender'
import { parseCelebrities } from '~/utils/toneCelebrities'

const route = useRoute()
const { plan, rank, setPlan } = useMembership()

const input = computed(() => {
  const genderQuery = route.query.gender as string | undefined
  return {
    name: (route.query.name as string) || 'ゲスト',
    birthdate: (route.query.birth as string) || '1992-10-16',
    gender: genderQuery && isGender(genderQuery) ? genderQuery : DEFAULT_GENDER
  }
})
const { result } = useDiagnosis(input)

const content = useDiagnosisContent({
  sealIndex: computed(() => result.value.sealIndex),
  wavespellSealIndex: computed(() => result.value.wavespellSealIndex),
  toneIndex: computed(() => result.value.toneIndex),
  kin: computed(() => result.value.kin)
})
const sunText = computed(() => content.sunText.value ?? result.value.sun.text)
const wavespellText = computed(() => content.wavespellText.value ?? result.value.wavespell.text)
const toneText = computed(() => content.toneText.value ?? result.value.tone.text)
const sunProfile = computed(() => content.sunProfile.value)
const wavespellProfile = computed(() => content.wavespellProfile.value)
const toneProfile = computed(() => content.toneProfile.value)
// docs/KIN番号診断結果マスタ.xlsx由来、KIN番号1つに対して1本のみの読み物。紋章/音と違って
// 元々ハードコードされたフォールバック文言が無いので、Firestoreにまだ無ければセクション自体を
// 出さない(v-if="kinText" — 下のtemplate参照)。全260件無料公開。
const kinText = computed(() => content.kinText.value)

// 銀河の音プロフィール(docs/銀河の音診断結果マスタ.xlsx由来)の深掘り項目。紋章プロフィールと違い
// 無料/有料の区切りがマスタ側に無いため、全項目を常時無料で表示する。
const toneProfileSections = computed(() => {
  const p = toneProfile.value
  if (!p) return []
  return [
    { label: '基本スペック', text: p.basicSpecs },
    { label: '性格の強み', text: p.strengths },
    { label: '注意するべき点', text: p.cautions }
  ].filter((s) => s.text)
})
const toneCelebrities = computed(() => parseCelebrities(toneProfile.value?.celebrities))

// 紋章プロフィール(docs/診断結果マスタ.xlsx由来)の深掘り項目。マスタの行構成(1〜14行目=無料、
// 15行目以降=有料)に合わせて分割している。総合解説(sunText/wavespellText)とあなたはこんな人
// (traits)は別枠で常時無料。cautionDetail/cautionDetailPremiumは元々マスタの同一セル
// (row14+15)を1つのフィールドとして結合していたものを分割した経緯があり、「注意すべき傾向」の
// 続きとして premium 側に表示する — 詳細は scripts/characters.data.ts の2026-08-05コメント参照。
// 太陽の紋章・ウェイブスペルは別人格(別キャラクター)なので、それぞれ自分のセクション内で自分の
// プロフィールを深掘りする(2026-08-06以前は両方まとめて「あなたについて」という1セクションに
// していたが、実際には太陽の紋章側のプロフィールしか出せておらず紛らわしかったため分離した)。
const deepUnlocked = computed(() => rank.value >= 1)
function freeProfileSections(p: CharacterProfileFields | null) {
  if (!p) return []
  const strengths = [p.strengthsSummary, p.strengthsDetail].filter(Boolean).join('\n\n')
  const caution = [p.cautionSummary, p.cautionDetail].filter(Boolean).join('\n\n')
  return [
    { label: 'キャリアパス', text: p.careerPath },
    { label: 'あなたが喜ぶこと', text: p.likes },
    { label: 'あなたが嫌がること', text: p.dislikes },
    { label: 'コミュニケーションの強み', text: p.communicationStrengths },
    { label: 'コミュニケーションの課題', text: p.communicationChallenges },
    { label: 'あなたの性格の強み', text: strengths },
    { label: '注意すべき傾向', text: caution }
  ].filter((s) => s.text)
}
function premiumProfileSections(p: CharacterProfileFields | null) {
  if (!p) return []
  return [
    { label: '', text: p.cautionDetailPremium },
    { label: '実践的なヒント', text: p.practicalTips },
    { label: '人生で一番伸びる環境', text: p.bestEnvironment },
    { label: '人生で一番向いている役割', text: p.bestRole },
    { label: '恋愛・パートナーシップ', text: p.loveAndPartnership },
    { label: '仕事で成功する方法', text: p.careerSuccess },
    { label: '運気が上がる行動', text: p.luckUpActions },
    { label: '運気が下がるクセ', text: p.luckDownHabits }
  ].filter((s) => s.text)
}
const sunFreeProfileSections = computed(() => freeProfileSections(sunProfile.value))
const sunPremiumProfileSections = computed(() => premiumProfileSections(sunProfile.value))
const wavespellFreeProfileSections = computed(() => freeProfileSections(wavespellProfile.value))
const wavespellPremiumProfileSections = computed(() => premiumProfileSections(wavespellProfile.value))

// KINの関係性(ガイド/神秘/反対/類似KIN)・運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)。
// 「同じ番号」「連番」は参照元(マヤDAN)の個別KINページ上に定義が見当たらなかったため、
// ユーザー確認のうえ定義(utils/mayaCalc.ts参照)。
const relations = computed(() => [
  { label: 'ガイドKIN', seal: result.value.relations.guide },
  { label: '神秘KIN', seal: result.value.relations.mystic },
  { label: '反対KIN', seal: result.value.relations.antipode },
  { label: '類似KIN', seal: result.value.relations.analog }
])

const displayBirthdate = computed(() => {
  const d = new Date(input.value.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const displayGender = computed(() => genderLabel(result.value.gender))
const chipClass = computed(() => ({
  free: 'border border-parchment-300/40 text-parchment-100',
  light: 'border border-gold-500 text-gold-300',
  standard: 'bg-gold-600 text-[#241a06]',
  premium: 'bg-gradient-to-r from-gold-500 to-gold-300 text-[#241a06]'
}[plan.value]))

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
      <dl class="mb-2 grid grid-cols-1 divide-y divide-gold-500/20 rounded border border-gold-500/30 bg-white/[.02] px-6 py-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div class="py-3 text-center sm:py-0"><dt class="mb-1.5 text-[12px] tracking-[.15em] text-parchment-300">お名前</dt><dd class="text-xl font-semibold sm:text-2xl">{{ result.name }} 様</dd></div>
        <div class="py-3 text-center sm:py-0"><dt class="mb-1.5 text-[12px] tracking-[.15em] text-parchment-300">生年月日</dt><dd class="text-xl font-semibold sm:text-2xl">{{ displayBirthdate }}</dd></div>
        <div class="py-3 text-center sm:py-0"><dt class="mb-1.5 text-[12px] tracking-[.15em] text-parchment-300">性別</dt><dd class="text-xl font-semibold sm:text-2xl">{{ displayGender }}</dd></div>
      </dl>

      <!-- ドリームスペル暦 -->
      <section class="pb-2 pt-10">
        <KinBadge :kin="result.kin" />

        <!-- KIN概要: mayadan.jp/kin/xxx のような、太陽の紋章・ウェイブスペル・銀河の音の一覧表示 -->
        <div class="mx-auto mt-7 flex max-w-[640px] flex-row flex-wrap items-start justify-center gap-7 sm:gap-12">
          <div class="flex flex-col items-center gap-2.5 text-center">
            <MayaGlyph :seal-index="result.sealIndex" size="xl" />
            <div class="text-[12px] tracking-[.06em] text-gold-300">太陽の紋章 <span class="text-parchment-300">顕在意識</span></div>
            <div class="font-display text-[21px]">{{ result.sun.seal.name }}</div>
          </div>
          <div class="flex flex-col items-center gap-2.5 text-center">
            <MayaGlyph :seal-index="result.wavespellSealIndex" size="xl" />
            <div class="text-[12px] tracking-[.06em] text-gold-300">ウェイブスペル <span class="text-parchment-300">潜在意識</span></div>
            <div class="font-display text-[21px]">{{ result.wavespell.seal.name }}</div>
          </div>
          <div class="flex flex-col items-center gap-2.5 text-center">
            <div class="flex h-32 w-32 flex-none items-center justify-center rounded-full border-2 border-gold-500 bg-ink-900">
              <span class="font-display -mt-2.5 text-[80px] leading-none text-gold-300">{{ result.toneIndex + 1 }}</span>
            </div>
            <div class="text-[12px] tracking-[.06em] text-gold-300">銀河の音</div>
            <div class="font-display text-[21px]">{{ result.tone.info.name }}</div>
          </div>
        </div>
      </section>

      <!-- 太陽の紋章 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="太陽の紋章" eyebrow="Sun Sign" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          太陽の紋章は、あなたの顕在意識——つまり周囲から見えている「本質」と「表の性格」を映し出します。
        </p>
        <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
          <MayaPortrait :seal-index="result.sealIndex" />
          <div>
            <h3 class="font-display text-[19px]">
              {{ result.sun.seal.name }}<span v-if="sunProfile?.archetype" class="ml-1.5 text-[14px] font-normal text-parchment-300">{{ sunProfile.archetype }}</span>
            </h3>
            <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.sun.seal.english }} ｜ {{ result.sun.seal.keyword }}</span>
            <p v-if="sunProfile?.catchphrase" class="mb-2 text-[13.5px] font-semibold text-gold-300">{{ sunProfile.catchphrase }}</p>
            <p class="text-[14.5px] leading-[1.9] opacity-90">{{ sunText }}</p>
          </div>
        </div>

        <div v-if="sunProfile?.traits" class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
          <div>
            <h4 class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">あなたはこんな人です</h4>
            <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ sunProfile.traits }}</p>
          </div>
        </div>

        <template v-if="sunFreeProfileSections.length">
          <div class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
            <div v-for="s in sunFreeProfileSections" :key="s.label">
              <h4 class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
              <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
            </div>
          </div>
        </template>

        <template v-if="sunPremiumProfileSections.length">
          <template v-if="deepUnlocked">
            <div class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
              <div v-for="s in sunPremiumProfileSections" :key="s.label" :class="{ '-mt-6': !s.label }">
                <h4 v-if="s.label" class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
                <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
              </div>
            </div>
          </template>
          <LockedVeil v-else label="太陽の紋章プロフィールの続きはライトプラン以上でご覧いただけます" class="mt-7.5">
            <div class="mx-auto max-w-[560px] grid gap-5">
              <div v-for="s in sunPremiumProfileSections" :key="s.label" :class="{ '-mt-6': !s.label }">
                <h4 v-if="s.label" class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
                <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
              </div>
            </div>
          </LockedVeil>
        </template>
      </section>

      <!-- ウェイブスペル -->
      <section class="pb-2 pt-14">
        <SectionDivider label="ウェイブスペル" eyebrow="Wave Spell" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          ウェイブスペルは、あなたの潜在意識——まだ本人も気づいていない可能性や、生まれ持った才能の方向性を表します。
        </p>
        <div class="flex flex-col items-center gap-3.5 text-center sm:flex-row sm:items-start sm:gap-5.5 sm:text-left">
          <MayaPortrait :seal-index="result.wavespellSealIndex" />
          <div>
            <h3 class="font-display text-[19px]">
              {{ result.wavespell.seal.name }}<span v-if="wavespellProfile?.archetype" class="ml-1.5 text-[14px] font-normal text-parchment-300">{{ wavespellProfile.archetype }}</span>
            </h3>
            <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.wavespell.seal.english }} ｜ {{ result.wavespell.seal.keyword }}</span>
            <p v-if="wavespellProfile?.catchphrase" class="mb-2 text-[13.5px] font-semibold text-gold-300">{{ wavespellProfile.catchphrase }}</p>
            <p class="text-[14.5px] leading-[1.9] opacity-90">{{ wavespellText }}</p>
          </div>
        </div>

        <div v-if="wavespellProfile?.traits" class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
          <div>
            <h4 class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">あなたはこんな人です</h4>
            <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ wavespellProfile.traits }}</p>
          </div>
        </div>

        <template v-if="wavespellFreeProfileSections.length">
          <div class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
            <div v-for="s in wavespellFreeProfileSections" :key="s.label">
              <h4 class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
              <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
            </div>
          </div>
        </template>

        <template v-if="wavespellPremiumProfileSections.length">
          <template v-if="deepUnlocked">
            <div class="mx-auto mt-7.5 grid max-w-[560px] gap-5">
              <div v-for="s in wavespellPremiumProfileSections" :key="s.label" :class="{ '-mt-6': !s.label }">
                <h4 v-if="s.label" class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
                <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
              </div>
            </div>
          </template>
          <LockedVeil v-else label="ウェイブスペルプロフィールの続きはライトプラン以上でご覧いただけます" class="mt-7.5">
            <div class="mx-auto max-w-[560px] grid gap-5">
              <div v-for="s in wavespellPremiumProfileSections" :key="s.label" :class="{ '-mt-6': !s.label }">
                <h4 v-if="s.label" class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
                <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
              </div>
            </div>
          </LockedVeil>
        </template>
      </section>

      <!-- 銀河の音 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="銀河の音" eyebrow="Galactic Tone" />
        <p class="mx-auto mb-7.5 max-w-[560px] text-center text-[14.5px] leading-[1.9] text-parchment-300">
          銀河の音は、260日のツォルキン暦を13日ごとに巡る周期のリズムを表し、あなたが力を発揮しやすいテンポを示します。
        </p>
        <div class="text-center">
          <h3 class="font-display text-[19px]">{{ result.tone.info.name }}</h3>
          <span class="mb-2.5 block text-[13px] tracking-[.04em] text-gold-300">{{ result.tone.info.english }}</span>
          <p v-if="toneProfile?.title" class="mb-2 text-[13.5px] font-semibold text-gold-300">{{ toneProfile.title }}</p>
          <p class="mx-auto max-w-[560px] text-[14.5px] leading-[1.9] opacity-90">{{ toneText }}</p>
        </div>

        <template v-if="toneProfileSections.length">
          <div class="mx-auto mt-7.5 grid max-w-[560px] gap-5 text-left">
            <div v-for="s in toneProfileSections" :key="s.label">
              <h4 class="mb-1.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">{{ s.label }}</h4>
              <p class="whitespace-pre-line text-[14px] leading-[1.85] opacity-90">{{ s.text }}</p>
            </div>
          </div>
        </template>

        <div v-if="toneCelebrities.length" class="mx-auto mt-7.5 max-w-[560px] text-left">
          <h4 class="mb-2.5 text-[12.5px] font-bold tracking-[.03em] text-gold-300">同じ音を持つ有名人</h4>
          <ul class="grid gap-1.5 text-[13px] leading-[1.6] opacity-90 sm:grid-cols-2">
            <li v-for="c in toneCelebrities" :key="c.name + c.kin">
              {{ c.name }}<span class="text-parchment-300">（{{ c.combo }}）</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- KIN番号のあなたへ: docs/KIN番号診断結果マスタ.xlsx由来、個別要素(紋章/音)ではなくKIN
           全体への語りかけなので、内訳を読んだ後・関係性データの前に置く。全260件無料公開。 -->
      <section v-if="kinText" class="pb-2 pt-14">
        <SectionDivider :label="`KIN${result.kin}のあなたへ`" eyebrow="Your Kin" />
        <p class="mx-auto max-w-[560px] whitespace-pre-line text-center text-[14.5px] leading-[1.9] opacity-90">{{ kinText }}</p>
      </section>

      <!-- KINの関係性: 無料 -->
      <section class="pb-2 pt-14">
        <SectionDivider label="KINの関係性" eyebrow="Kin Relations" />
        <div class="mx-auto grid max-w-[560px] grid-cols-2 gap-5 sm:grid-cols-4">
          <div v-for="r in relations" :key="r.label" class="flex flex-col items-center gap-2 text-center">
            <MayaGlyph :seal-index="r.seal.index" size="md" />
            <span class="text-[11px] tracking-[.06em] text-parchment-300">{{ r.label }}</span>
            <span class="text-[13px] font-semibold">{{ r.seal.name }}</span>
          </div>
        </div>
      </section>

      <!-- 運命数字: 無料、番号のみ -->
      <section class="pb-2 pt-14">
        <SectionDivider label="運命数字" eyebrow="Destiny Numbers" />
        <div class="mx-auto grid max-w-[640px] grid-cols-2 gap-3.5 text-center sm:grid-cols-5">
          <div class="rounded border border-gold-500/30 bg-white/[.02] px-4 py-3.5">
            <div class="mb-1 text-[11px] tracking-[.06em] text-parchment-300">同じKIN</div>
            <div class="font-display text-[20px] text-gold-300 tabular-nums">KIN {{ result.destinyNumbers.sameNumberKin }}</div>
          </div>
          <div class="rounded border border-gold-500/30 bg-white/[.02] px-4 py-3.5">
            <div class="mb-1 text-[11px] tracking-[.06em] text-parchment-300">前のKIN</div>
            <div class="font-display text-[20px] text-gold-300 tabular-nums">KIN {{ result.destinyNumbers.prevKin }}</div>
          </div>
          <div class="rounded border border-gold-500/30 bg-white/[.02] px-4 py-3.5">
            <div class="mb-1 text-[11px] tracking-[.06em] text-parchment-300">次のKIN</div>
            <div class="font-display text-[20px] text-gold-300 tabular-nums">KIN {{ result.destinyNumbers.nextKin }}</div>
          </div>
          <div class="rounded border border-gold-500/30 bg-white/[.02] px-4 py-3.5">
            <div class="mb-1 text-[11px] tracking-[.06em] text-parchment-300">鏡の向こうの自分KIN</div>
            <div class="font-display text-[20px] text-gold-300 tabular-nums">KIN {{ result.destinyNumbers.mirrorKin }}</div>
          </div>
          <div class="rounded border border-gold-500/30 bg-white/[.02] px-4 py-3.5">
            <div class="mb-1 text-[11px] tracking-[.06em] text-parchment-300">絶対反対KIN</div>
            <div class="font-display text-[20px] text-gold-300 tabular-nums">KIN {{ result.destinyNumbers.absoluteOppositeKin }}</div>
          </div>
        </div>
      </section>

      <!-- 相性診断への導線: 無料機能、ゲート無し -->
      <section class="pb-2 pt-14">
        <div class="rounded border border-gold-500/30 bg-white/[.02] p-5 text-center">
          <div class="mb-2 font-display text-[17px] text-gold-300">身近な人との相性を無料で診断</div>
          <p class="mb-4 text-[13px] text-parchment-300">パートナーや友人の生年月日を入れるだけで、紋章の組み合わせから相性を読み解きます。</p>
          <NuxtLink
            :to="{ path: '/compatibility', query: { name: result.name, birth: input.birthdate, gender: result.gender } }"
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
