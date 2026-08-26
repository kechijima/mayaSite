<script setup lang="ts">
import { doc, getDoc, type Firestore } from 'firebase/firestore'
import dividerSrc from '~/assets/images/optimized/divider.webp'
import type { DiagnosisContentDoc } from '~/composables/useDiagnosisContent'
import { SEALS, sealColor } from '~/utils/mayaData'
import { iconFor, freeProfileSections, premiumProfileSections, countChars } from '~/utils/profileSections'
import { RELATION_DESCRIPTION } from '~/utils/kinRelations'
import { DEFAULT_GENDER, isGender } from '~/utils/gender'
import { buildSignupLink } from '~/utils/signupLink'

// KINの関係性カード(pages/result.vueのガイド/神秘/反対/類似KIN)の「詳しく見る」遷移先。
// 各関係性は特定のKIN番号ではなく紋章(sealIndex)そのものなので、太陽の紋章/ウェイブスペルと
// 同じ character-{sealIndex} Firestoreドキュメントをそのまま読み、同じ無料/有料レイアウトで
// 表示する(有料エリアの扱いもresult.vueに合わせる)。

const route = useRoute()
const { user, ready } = useAuth()
const deepUnlocked = computed(() => ready.value && !!user.value)
// 会員登録/ログイン後にこのページへ戻れるよう、LockedVeilに渡す遷移先(pages/result.vueと同じ考え方)。
const signupRedirectTo = computed(() => buildSignupLink(route.fullPath, route.query))

const sealIndex = computed(() => {
  const n = Number(route.params.sealIndex)
  return Number.isInteger(n) && n >= 0 && n < SEALS.length ? n : null
})
const seal = computed(() => (sealIndex.value !== null ? SEALS[sealIndex.value] : null))
// v-ifで seal が存在する分岐でのみ使う、null不可版のインデックス。
const safeSealIndex = computed(() => sealIndex.value ?? 0)

// 関係性カード(result.vue)からの遷移時だけ ?label= が付く。直接 /kin/{n} を開いた場合は
// 無関係な文言(存在しないlabel)を出さないよう、既知のラベルのときだけ採用する。
const relationLabel = computed(() => {
  const l = route.query.label
  return typeof l === 'string' && l in RELATION_DESCRIPTION ? l : undefined
})

const gender = computed(() => {
  const g = route.query.gender
  return typeof g === 'string' && isGender(g) ? g : DEFAULT_GENDER
})

// 診断結果ページへ戻るリンク用。遷移元のname/birth/genderをそのまま持ち回し、
// 戻ったときに同じ診断結果が出るようにする(指定が無ければresult.vue側の既定値に委ねる)。
const backQuery = computed(() => ({
  name: route.query.name as string | undefined,
  birth: route.query.birth as string | undefined,
  gender: route.query.gender as string | undefined
}))

const { $firestore } = useNuxtApp()
const { data: profile } = useAsyncData(
  'kin-detail-profile',
  async () => {
    if (sealIndex.value === null) return null
    const firestore = $firestore as Firestore
    const snap = await getDoc(doc(firestore, 'diagnosisContent', `character-${sealIndex.value}`))
    if (!snap.exists()) return null
    const data = snap.data() as DiagnosisContentDoc
    return data.status === '公開' ? data : null
  },
  { server: false, lazy: true, watch: [sealIndex] }
)

// Firestoreに未公開/未セットの場合は、太陽の紋章/ウェイブスペルと同じくSEALSのessenceに
// フォールバックする(useDiagnosis.tsのsun.text相当)。
const profileText = computed(() => profile.value?.freeText || seal.value?.essence || '')
const freeSections = computed(() => freeProfileSections(profile.value))
const personalityStrength = computed(() => freeSections.value.find((s) => s.label === 'あなたの性格の強み') ?? null)
const otherFreeSections = computed(() => freeSections.value.filter((s) => s.label !== 'あなたの性格の強み'))
const premiumSections = computed(() => premiumProfileSections(profile.value))
</script>

<template>
  <div class="paper-page min-h-screen">
    <IconSprite />

    <div class="sheet">
      <template v-if="seal">
        <section class="section" :data-seal="sealColor(safeSealIndex)">
          <div class="archframe" aria-hidden="true"><img :src="dividerSrc" alt="" width="1536" height="1024" decoding="async" /></div>
          <div class="section__eyebrow">{{ relationLabel ?? '紋章プロフィール' }}</div>
          <h1 class="font-display section__title">{{ seal.name }}</h1>
          <p v-if="relationLabel" class="masthead__sub">{{ RELATION_DESCRIPTION[relationLabel] }}</p>
          <div class="dossier">
            <MayaPortrait :seal-index="safeSealIndex" :gender="gender" />
            <div class="dossier__main">
              <div class="dossier__headrow">
                <h3 class="font-display dossier__name">{{ seal.name }}</h3>
                <span v-if="profile?.archetype" class="dossier__badge">{{ profile.archetype }}</span>
              </div>
              <p v-if="profile?.catchphrase" class="dossier__catch">{{ profile.catchphrase }}</p>

              <div class="dossier__blocks">
                <div v-if="profile?.traits?.length" class="block">
                  <div class="block__head"><svg><use :href="`#${iconFor('あなたはこんな人です')}`" /></svg><h3>あなたはこんな人です</h3></div>
                  <ul class="checklist">
                    <li v-for="(t, i) in profile.traits" :key="i"><svg><use href="#i-check" /></svg>{{ t }}</li>
                  </ul>
                </div>
              </div>
            </div>
            <div v-if="personalityStrength" class="block dossier__strength">
              <div class="block__head"><svg><use :href="`#${iconFor(personalityStrength.label)}`" /></svg><h3>{{ personalityStrength.label }}</h3></div>
              <template v-if="personalityStrength.kind === 'list-then-text'">
                <ul class="checklist">
                  <li v-for="(item, i) in personalityStrength.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
                </ul>
                <p v-if="personalityStrength.text">{{ personalityStrength.text }}</p>
              </template>
            </div>
          </div>

          <div class="block">
            <div class="block__head"><svg><use :href="`#${iconFor('総合解説')}`" /></svg><h3>総合解説</h3></div>
            <p style="white-space: pre-line;">{{ profileText }}</p>
          </div>

          <ProfileBlocks :sections="otherFreeSections" />

          <ProfileBlocks v-if="deepUnlocked" :sections="premiumSections" />
          <LockedVeil v-else-if="premiumSections.length" :to="signupRedirectTo" :remaining-chars="countChars(premiumSections)" />
        </section>

        <div class="mt-8 flex justify-center">
          <NuxtLink
            :to="{ path: '/result', query: backQuery }"
            class="rounded-full px-6.5 py-2.5 text-center text-[13.5px] font-semibold"
            style="border: 1px solid var(--gold-line); color: var(--ink-soft);"
          >
            診断結果に戻る
          </NuxtLink>
        </div>
      </template>

      <template v-else>
        <section class="section">
          <div class="archframe" aria-hidden="true"><img :src="dividerSrc" alt="" width="1536" height="1024" decoding="async" /></div>
          <div class="section__eyebrow">紋章プロフィール</div>
          <h1 class="font-display section__title">紋章が見つかりません</h1>
          <p class="text-center" style="color: var(--ink-soft);">指定された紋章が見つかりませんでした。</p>
          <div class="mt-6 flex justify-center">
            <NuxtLink
              to="/"
              class="rounded-full px-6.5 py-2.5 text-center text-[13.5px] font-semibold"
              style="border: 1px solid var(--gold-line); color: var(--ink-soft);"
            >
              トップに戻る
            </NuxtLink>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
