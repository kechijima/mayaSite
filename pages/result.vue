<script setup lang="ts">
import { PLAN_META, type MembershipPlan } from '~/composables/useMembership'
import type { CharacterProfileFields } from '~/composables/useDiagnosisContent'
import type { PaperVariant } from '~/composables/usePaperTheme'
import { DEFAULT_GENDER, genderLabel, isGender } from '~/utils/gender'
import { parseCelebrities } from '~/utils/toneCelebrities'
import { sealColor } from '~/utils/mayaData'
import mastheadArchSrc from '~/assets/images/optimized/top-bg.webp'

const route = useRoute()
const { plan, rank, setPlan } = useMembership()
const { paper, setPaper } = usePaperTheme()
const { bustSrc } = useSealCutouts()

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

// 2026-08-10: 純粋な箇条書きのフィールド(下記参照)はFirestore側もstring[]に変更した
// (scripts/migrateBulletFields.ts参照)。混在フィールド(bestEnvironment/bestRole/
// luckDownHabits)は対象外で従来通りstring。表示側はkindで分岐し、textはpタグ、listは
// チェックアイコン付きの.checklistとして描画する。
type ProfileSection = { label: string } & (
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  // あなたの性格の強み(strengthsSummary+strengthsDetail)・注意すべき傾向(cautionSummary+
  // cautionDetail)専用 — 箇条書きの要約に続けて、プレーンな文章の詳細を1ブロック内に表示する。
  | { kind: 'list-then-text'; items: string[]; text: string }
)

// 銀河の音プロフィール(docs/銀河の音診断結果マスタ.xlsx由来)の深掘り項目。紋章プロフィールと違い
// 無料/有料の区切りがマスタ側に無いため、全項目を常時無料で表示する。3項目とも純粋な箇条書き。
const toneProfileSections = computed(() => {
  const p = toneProfile.value
  if (!p) return []
  return (
    [
      { label: '基本スペック', items: p.basicSpecs },
      { label: '性格の強み', items: p.strengths },
      { label: '注意するべき点', items: p.cautions }
    ] as { label: string; items?: string[] }[]
  ).filter((s): s is { label: string; items: string[] } => !!s.items?.length)
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
function freeProfileSections(p: CharacterProfileFields | null): ProfileSection[] {
  if (!p) return []
  const sections: (ProfileSection | null)[] = [
    p.careerPath ? { kind: 'text', label: 'キャリアパス', text: p.careerPath } : null,
    p.likes?.length ? { kind: 'list', label: 'あなたが喜ぶこと', items: p.likes } : null,
    p.dislikes?.length ? { kind: 'list', label: 'あなたが嫌がること', items: p.dislikes } : null,
    p.communicationStrengths?.length ? { kind: 'list', label: 'コミュニケーションの強み', items: p.communicationStrengths } : null,
    p.communicationChallenges?.length ? { kind: 'list', label: 'コミュニケーションの課題', items: p.communicationChallenges } : null,
    p.strengthsSummary?.length ? { kind: 'list-then-text', label: 'あなたの性格の強み', items: p.strengthsSummary, text: p.strengthsDetail ?? '' } : null,
    p.cautionSummary?.length ? { kind: 'list-then-text', label: '注意すべき傾向', items: p.cautionSummary, text: p.cautionDetail ?? '' } : null
  ]
  return sections.filter((s): s is ProfileSection => s !== null)
}
function premiumProfileSections(p: CharacterProfileFields | null): ProfileSection[] {
  if (!p) return []
  const sections: (ProfileSection | null)[] = [
    p.cautionDetailPremium ? { kind: 'text', label: '', text: p.cautionDetailPremium } : null,
    p.practicalTips?.length ? { kind: 'list', label: '実践的なヒント', items: p.practicalTips } : null,
    p.bestEnvironment ? { kind: 'text', label: '人生で一番伸びる環境', text: p.bestEnvironment } : null,
    p.bestRole ? { kind: 'text', label: '人生で一番向いている役割', text: p.bestRole } : null,
    p.loveAndPartnership ? { kind: 'text', label: '恋愛・パートナーシップ', text: p.loveAndPartnership } : null,
    p.careerSuccess ? { kind: 'text', label: '仕事で成功する方法', text: p.careerSuccess } : null,
    p.luckUpActions?.length ? { kind: 'list', label: '運気が上がる行動', items: p.luckUpActions } : null,
    p.luckDownHabits ? { kind: 'text', label: '運気が下がるクセ', text: p.luckDownHabits } : null
  ]
  return sections.filter((s): s is ProfileSection => s !== null)
}
const sunFreeProfileSections = computed(() => freeProfileSections(sunProfile.value))
const sunPremiumProfileSections = computed(() => premiumProfileSections(sunProfile.value))
const wavespellFreeProfileSections = computed(() => freeProfileSections(wavespellProfile.value))
const wavespellPremiumProfileSections = computed(() => premiumProfileSections(wavespellProfile.value))

// あなたの性格の強みは、あなたはこんな人ですと並べてアーキタイプ画像の右側に配置する
// (モックアップ準拠)。それ以外の無料項目は、画像の下の全幅エリアに続けて表示する。
function findByLabel(sections: ProfileSection[], label: string) {
  return sections.find((s) => s.label === label) ?? null
}
function excludingLabel(sections: ProfileSection[], label: string) {
  return sections.filter((s) => s.label !== label)
}
const sunPersonalityStrength = computed(() => findByLabel(sunFreeProfileSections.value, 'あなたの性格の強み'))
const sunOtherFreeProfileSections = computed(() => excludingLabel(sunFreeProfileSections.value, 'あなたの性格の強み'))
const wavespellPersonalityStrength = computed(() => findByLabel(wavespellFreeProfileSections.value, 'あなたの性格の強み'))
const wavespellOtherFreeProfileSections = computed(() => excludingLabel(wavespellFreeProfileSections.value, 'あなたの性格の強み'))

// アイコンは見た目だけの割り当て(業務ロジックとは無関係)。ラベル文字列は上の
// free/premiumProfileSections で定義した固定値と一致させている。
const SECTION_ICON: Record<string, string> = {
  '総合解説': 'i-scroll',
  'あなたはこんな人です': 'i-crown',
  'キャリアパス': 'i-path',
  'あなたが喜ぶこと': 'i-heart',
  'あなたが嫌がること': 'i-heart-off',
  'コミュニケーションの強み': 'i-chat',
  'コミュニケーションの課題': 'i-chat-x',
  'あなたの性格の強み': 'i-gem',
  '注意すべき傾向': 'i-warn',
  '実践的なヒント': 'i-bulb',
  '人生で一番伸びる環境': 'i-sprout',
  '人生で一番向いている役割': 'i-shield',
  '恋愛・パートナーシップ': 'i-heart',
  '仕事で成功する方法': 'i-trophy',
  '運気が上がる行動': 'i-clover',
  '運気が下がるクセ': 'i-clover-off',
  '基本スペック': 'i-crown',
  '性格の強み': 'i-gem',
  '注意するべき点': 'i-warn'
}
function iconFor(label: string) {
  return SECTION_ICON[label] ?? 'i-scroll'
}

// KINの関係性(ガイド/神秘/反対/類似KIN)・運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)。
// 「同じ番号」「連番」は参照元(マヤDAN)の個別KINページ上に定義が見当たらなかったため、
// ユーザー確認のうえ定義(utils/mayaCalc.ts参照)。
const relations = computed(() => [
  { label: 'ガイドKIN', seal: result.value.relations.guide },
  { label: '神秘KIN', seal: result.value.relations.mystic },
  { label: '反対KIN', seal: result.value.relations.antipode },
  { label: '類似KIN', seal: result.value.relations.analog }
])
// KINの関係性カードの説明文は実データに存在しないため、関係性の種類ごとの一般的な意味を
// 静的コピーとして用意している(デザインモックアップ時に作文したもの)。
const RELATION_DESCRIPTION: Record<string, string> = {
  'ガイドKIN': 'あなたを導き、後押ししてくれるアーキタイプ。迷った時や決断が必要な時、頼りになるアドバイスをくれる存在です。困った時は相談してみましょう。',
  '神秘KIN': '前世からの深い縁で結ばれたアーキタイプ。強く惹かれ合う一方で、お互いに足りない部分を補い合う関係でもあります。頼りすぎないよう気をつけましょう。',
  '反対KIN': 'あなたと正反対の性質を持つアーキタイプ。得意なことも苦手なこともまるで鏡のように違いますが、だからこそお互いを補い合える関係です。',
  '類似KIN': '本質がよく似た、最も気の合うアーキタイプ。多くの価値観を共有できるため、一緒にいて自然体でいられる、居心地の良い存在です。'
}

const displayBirthdate = computed(() => {
  const d = new Date(input.value.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const displayGender = computed(() => genderLabel(result.value.gender))

const demoPlans: { id: MembershipPlan; label: string }[] = [
  { id: 'free', label: '無料' },
  { id: 'paid', label: '有料' }
]
const demoPapers: { id: PaperVariant; label: string }[] = [
  { id: 'beige', label: 'ベージュ' },
  { id: 'white', label: '白' }
]
</script>

<template>
  <div class="paper-page min-h-screen pb-24">
    <IconSprite />

    <div class="sheet sheet--flush">
      <div class="masthead">
        <div class="masthead__arch" aria-hidden="true"><img :src="mastheadArchSrc" alt="" /></div>
        <span class="masthead__eyebrow">Maya Sacred Calendar</span>
        <h1 class="font-display masthead__title">あなたの本質と運勢</h1>
        <p class="masthead__sub">古代マヤの暦「ツォルキン」があなたの生年月日から読み解く、本当のあなた。</p>
      </div>

      <div class="mx-auto mb-8 grid max-w-[640px] grid-cols-3 gap-3 text-center">
        <div class="numcell">
          <span class="numcell__label">お名前</span>
          <span class="font-display text-[17px]">{{ result.name }} 様</span>
        </div>
        <div class="numcell">
          <span class="numcell__label">生年月日</span>
          <span class="text-[17px] tabular-nums" style="font-family: 'Shippori Mincho', serif;">{{ displayBirthdate }}</span>
        </div>
        <div class="numcell">
          <span class="numcell__label">性別</span>
          <span class="font-display text-[17px]">{{ displayGender }}</span>
        </div>
      </div>

      <!-- ドリームスペル暦: KIN番号 + 太陽の紋章/ウェイブスペル/銀河の音 概要 -->
      <div class="kinhero">
        <div class="kinhero__portrait">
          <div class="kinhero__frame"><MayaPortraitFrame :seal-index="result.sealIndex" :gender="result.gender" /></div>
          <span class="kinhero__name-plate">{{ result.sun.seal.name }}</span>
        </div>
        <div class="kinhero__center">
          <KinBadge :kin="result.kin" />
          <div class="kinhero__tone-spacer">
            <GoldMedal :value="result.toneIndex + 1" diamonds />
          </div>
          <span class="kinhero__name-plate">{{ result.tone.info.name }}</span>
        </div>
        <div class="kinhero__portrait">
          <div class="kinhero__frame"><MayaPortraitFrame :seal-index="result.wavespellSealIndex" :gender="result.gender" /></div>
          <span class="kinhero__name-plate">{{ result.wavespell.seal.name }}</span>
        </div>
      </div>

      <!-- 太陽の紋章 -->
      <section class="section" :data-seal="sealColor(result.sealIndex)">
        <SectionDivider label="太陽の紋章" eyebrow="顕在意識 — 行動を司るアーキタイプ" />
        <div class="dossier">
          <MayaPortrait :seal-index="result.sealIndex" :gender="result.gender" />
          <div class="dossier__main">
            <div class="dossier__headrow">
              <h3 class="font-display dossier__name">{{ result.sun.seal.name }}</h3>
              <span v-if="sunProfile?.archetype" class="dossier__badge">{{ sunProfile.archetype }}</span>
            </div>
            <p v-if="sunProfile?.catchphrase" class="dossier__catch">{{ sunProfile.catchphrase }}</p>

            <div class="dossier__blocks">
              <div v-if="sunProfile?.traits?.length" class="block">
                <div class="block__head"><svg><use :href="`#${iconFor('あなたはこんな人です')}`" /></svg><h3>あなたはこんな人です</h3></div>
                <ul class="checklist">
                  <li v-for="(t, i) in sunProfile.traits" :key="i"><svg><use href="#i-check" /></svg>{{ t }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div v-if="sunPersonalityStrength" class="block dossier__strength">
            <div class="block__head"><svg><use :href="`#${iconFor(sunPersonalityStrength.label)}`" /></svg><h3>{{ sunPersonalityStrength.label }}</h3></div>
            <template v-if="sunPersonalityStrength.kind === 'list-then-text'">
              <ul class="checklist">
                <li v-for="(item, i) in sunPersonalityStrength.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
              </ul>
              <p v-if="sunPersonalityStrength.text">{{ sunPersonalityStrength.text }}</p>
            </template>
          </div>
        </div>

        <div class="block">
          <div class="block__head"><svg><use :href="`#${iconFor('総合解説')}`" /></svg><h3>総合解説</h3></div>
          <p style="white-space: pre-line;">{{ sunText }}</p>
        </div>

        <div v-for="s in sunOtherFreeProfileSections" :key="s.label" class="block">
          <div class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <p v-if="s.kind === 'text'">{{ s.text }}</p>
          <ul v-else class="checklist">
            <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
          </ul>
          <p v-if="s.kind === 'list-then-text' && s.text">{{ s.text }}</p>
        </div>

        <div v-for="s in sunPremiumProfileSections" :key="s.label" class="block" :style="!s.label ? { marginTop: deepUnlocked ? '-3px' : '12px' } : {}">
          <div v-if="s.label" class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <template v-if="deepUnlocked">
            <p v-if="s.kind === 'text'">{{ s.text }}</p>
            <ul v-else class="checklist">
              <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
            </ul>
          </template>
          <LockedVeil v-else label="有料プランで続きを読む">
            <p v-if="s.kind === 'text'">{{ s.text }}</p>
            <ul v-else class="checklist">
              <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
            </ul>
          </LockedVeil>
        </div>
      </section>

      <!-- ウェイブスペル -->
      <section class="section" :data-seal="sealColor(result.wavespellSealIndex)">
        <SectionDivider label="ウェイブスペル" eyebrow="潜在意識 — 可能性を担うアーキタイプ" />
        <div class="dossier">
          <MayaPortrait :seal-index="result.wavespellSealIndex" :gender="result.gender" />
          <div class="dossier__main">
            <div class="dossier__headrow">
              <h3 class="font-display dossier__name">{{ result.wavespell.seal.name }}</h3>
              <span v-if="wavespellProfile?.archetype" class="dossier__badge">{{ wavespellProfile.archetype }}</span>
            </div>
            <p v-if="wavespellProfile?.catchphrase" class="dossier__catch">{{ wavespellProfile.catchphrase }}</p>

            <div class="dossier__blocks">
              <div v-if="wavespellProfile?.traits?.length" class="block">
                <div class="block__head"><svg><use :href="`#${iconFor('あなたはこんな人です')}`" /></svg><h3>あなたはこんな人です</h3></div>
                <ul class="checklist">
                  <li v-for="(t, i) in wavespellProfile.traits" :key="i"><svg><use href="#i-check" /></svg>{{ t }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div v-if="wavespellPersonalityStrength" class="block dossier__strength">
            <div class="block__head"><svg><use :href="`#${iconFor(wavespellPersonalityStrength.label)}`" /></svg><h3>{{ wavespellPersonalityStrength.label }}</h3></div>
            <template v-if="wavespellPersonalityStrength.kind === 'list-then-text'">
              <ul class="checklist">
                <li v-for="(item, i) in wavespellPersonalityStrength.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
              </ul>
              <p v-if="wavespellPersonalityStrength.text">{{ wavespellPersonalityStrength.text }}</p>
            </template>
          </div>
        </div>

        <div class="block">
          <div class="block__head"><svg><use :href="`#${iconFor('総合解説')}`" /></svg><h3>総合解説</h3></div>
          <p style="white-space: pre-line;">{{ wavespellText }}</p>
        </div>

        <div v-for="s in wavespellOtherFreeProfileSections" :key="s.label" class="block">
          <div class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <p v-if="s.kind === 'text'">{{ s.text }}</p>
          <ul v-else class="checklist">
            <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
          </ul>
          <p v-if="s.kind === 'list-then-text' && s.text">{{ s.text }}</p>
        </div>

        <div v-for="s in wavespellPremiumProfileSections" :key="s.label" class="block" :style="!s.label ? { marginTop: deepUnlocked ? '-3px' : '12px' } : {}">
          <div v-if="s.label" class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <template v-if="deepUnlocked">
            <p v-if="s.kind === 'text'">{{ s.text }}</p>
            <ul v-else class="checklist">
              <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
            </ul>
          </template>
          <LockedVeil v-else label="有料プランで続きを読む">
            <p v-if="s.kind === 'text'">{{ s.text }}</p>
            <ul v-else class="checklist">
              <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
            </ul>
          </LockedVeil>
        </div>
      </section>

      <!-- 銀河の音 -->
      <section class="section">
        <SectionDivider label="銀河の音" eyebrow="260日の周期が示すリズム" />
        <div class="tonecard">
          <div class="tonecard__left">
            <GoldMedal :value="result.toneIndex + 1" :size="92" :num-font-size="38" />
            <div class="tonecard__eyebrow">GALACTIC TONE</div>
            <h3 class="font-display tonecard__name">{{ result.tone.info.name }}</h3>
          </div>
          <div class="tonecard__body">
            <p v-if="toneProfile?.title" class="mb-1.5" style="color: var(--gold-deep); font-size: 13px; font-weight: 600;">{{ toneProfile.title }}</p>
            <p class="tonecard__desc">{{ toneText }}</p>
          </div>
        </div>

        <div v-for="s in toneProfileSections" :key="s.label" class="block">
          <div class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <ul class="checklist">
            <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
          </ul>
        </div>

        <div v-if="toneCelebrities.length" class="block">
          <div class="block__head"><svg><use href="#i-trophy" /></svg><h3>同じ音を持つ有名人</h3></div>
          <ul class="celeblist">
            <li v-for="c in toneCelebrities" :key="c.name + c.kin">{{ c.name }}<span>（{{ c.combo }}）</span></li>
          </ul>
        </div>
      </section>

      <!-- KIN番号のあなたへ: docs/KIN番号診断結果マスタ.xlsx由来、個別要素(紋章/音)ではなくKIN
           全体への語りかけなので、内訳を読んだ後・関係性データの前に置く。全260件無料公開。 -->
      <section v-if="kinText" class="section">
        <SectionDivider :label="`KIN${result.kin}のあなたへ`" eyebrow="紋章や音を超えた、あなたへの言葉" numeric />
        <p class="kinletter">{{ kinText }}</p>
      </section>

      <!-- KINの関係性: 無料 -->
      <section class="section">
        <SectionDivider label="KINの関係性" eyebrow="周囲の紋章とのつながり" />
        <div class="relwrap">
          <div v-for="r in relations" :key="r.label" class="relcard" :class="`relcard--${sealColor(r.seal.index)}`">
            <div class="relcard__figure"><MayaBust :seal-index="r.seal.index" :alt="r.seal.name" :gender="result.gender" /></div>
            <div class="relcard__body">
              <span class="relcard__label">{{ r.label }}</span>
              <h3 class="font-display relcard__name">{{ r.seal.name }}</h3>
              <p class="relcard__desc">{{ RELATION_DESCRIPTION[r.label] }}</p>
              <span class="relcard__cta"><span class="relcard__cta-icon"><img :src="bustSrc(r.seal.index)" :alt="''" /></span>詳しく見る</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 運命数字: 無料、番号のみ -->
      <section class="section">
        <SectionDivider label="運命数字" eyebrow="同じ周期を巡るKIN番号" />
        <div class="numrow">
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.sameNumberKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">同じKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.prevKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">前のKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.nextKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">次のKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.mirrorKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">鏡の向こうの自分KIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.absoluteOppositeKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">絶対反対KIN</span>
          </div>
        </div>
      </section>

      <!-- 相性診断への導線: 無料機能、ゲート無し -->
      <section class="section">
        <div class="mx-auto max-w-[560px] rounded-xl p-6 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
          <div class="mb-2 font-display text-[17px]" style="color: var(--gold-deep);">身近な人との相性を無料で診断</div>
          <p class="mb-4 text-[13px]" style="color: var(--ink-soft);">パートナーや友人の生年月日を入れるだけで、紋章の組み合わせから相性を読み解きます。</p>
          <NuxtLink
            :to="{ path: '/compatibility', query: { name: result.name, birth: input.birthdate, gender: result.gender } }"
            class="inline-block rounded-full px-6.5 py-2.5 text-[13.5px] font-semibold"
            style="border: 1px solid var(--gold); color: var(--gold-deep);"
          >
            相性診断をはじめる
          </NuxtLink>
        </div>
      </section>

      <p class="foot">
        古代4000年の智慧 マヤ暦占い ｜ {{ plan === 'free' ? '監修者紹介・占術紹介・利用規約はフッターメニューより' : `${PLAN_META[0].name}会員としてご利用中です` }}
      </p>
    </div>

    <!-- Demo-only toggles: no real auth/payment is wired up, this simulates it — same convention
         as the plan switcher. Paper theme is a persisted global preference (usePaperTheme), so
         /compatibility inherits whatever's chosen here with no switcher of its own, mirroring how
         it already silently inherits `plan`/`rank` today. -->
    <div class="fixed inset-x-4 bottom-4 z-40 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:flex-nowrap sm:rounded-full" style="border: 1px solid var(--gold-line); background: color-mix(in srgb, var(--paper-panel) 92%, transparent); color: var(--ink-soft);">
      <span class="whitespace-nowrap">検証用：</span>
      <div class="switch">
        <button v-for="d in demoPlans" :key="d.id" :aria-pressed="plan === d.id" @click="setPlan(d.id)">{{ d.label }}</button>
      </div>
      <div class="switch">
        <button v-for="p in demoPapers" :key="p.id" :aria-pressed="paper === p.id" @click="setPaper(p.id)">{{ p.label }}</button>
      </div>
    </div>
  </div>
</template>
