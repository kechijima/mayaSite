<script setup lang="ts">
import { type Firestore } from 'firebase/firestore'
import dividerSrc from '~/assets/images/optimized/divider.webp'
import { fetchPublishedDoc } from '~/composables/useDiagnosisContent'
import { kinInfo } from '~/utils/mayaCalc'
import { sealColor } from '~/utils/mayaData'
import { formatCelebrityBirth } from '~/utils/kinCelebrities'
import { buildSignupLink } from '~/utils/signupLink'

// result.vueの「運命数字」セクション(同じKIN/前のKIN/次のKIN/鏡の向こうの自分KIN/絶対反対KIN)
// から遷移してくる、任意のKIN番号(1-260)単体の解説ページ。中身はresult.vue自身の
// 「KIN{n}のあなたへ」セクション(kinText/kinCelebrities、diagnosisContentのkin-{n}ドキュメント)
// と同じデータ・同じ有料/無料の切り方を、閲覧者本人の生まれKINではなく指定されたKINに対して
// 再現する。

const route = useRoute()
const { user, ready } = useAuth()
const deepUnlocked = computed(() => ready.value && !!user.value)
const signupRedirectTo = computed(() => buildSignupLink(route.fullPath, route.query))

const targetKin = computed(() => {
  const n = Number(route.params.kin)
  return Number.isInteger(n) && n >= 1 && n <= 260 ? n : null
})
const info = computed(() => (targetKin.value !== null ? kinInfo(targetKin.value) : null))
const safeSealIndex = computed(() => info.value?.sealIndex ?? 0)

// 診断結果ページへ戻るリンク用。遷移元のname/birth/genderをそのまま持ち回す
// (pages/kin/[sealIndex].vueと同じ考え方)。
const backQuery = computed(() => ({
  name: route.query.name as string | undefined,
  birth: route.query.birth as string | undefined,
  gender: route.query.gender as string | undefined
}))

const { $firestore } = useNuxtApp()
const { data: kinDoc, pending } = useAsyncData(
  'kin-number-detail',
  async () => {
    if (targetKin.value === null) return null
    return fetchPublishedDoc($firestore as Firestore, `kin-${targetKin.value}`)
  },
  { server: false, lazy: true, watch: [targetKin] }
)

// result.vueと同じ切り方: 冒頭125文字だけ無料で読ませ、残りは有料エリア(LockedVeil)に送る。
// サロゲートペアの途中で切らないよう[...str]で文字単位に分解してから切る。
const KIN_LETTER_FREE_CHARS = 125
const kinText = computed(() => kinDoc.value?.freeText || null)
const kinLetterChars = computed(() => [...(kinText.value ?? '')])
const kinLetterRest = computed(() => kinLetterChars.value.slice(KIN_LETTER_FREE_CHARS).join('').trimStart())
const kinLetterLocked = computed(() => !deepUnlocked.value && kinLetterRest.value.length > 0)
const kinLetterFree = computed(() => {
  if (!kinLetterLocked.value) return kinText.value ?? ''
  return `${kinLetterChars.value.slice(0, KIN_LETTER_FREE_CHARS).join('').trimEnd()}…`
})

// 有名人一覧は本文の有料/無料を問わず常時無料(result.vueと同じ扱い)。
const kinCelebrities = computed(() => kinDoc.value?.kinCelebrities ?? [])
</script>

<template>
  <div class="paper-page min-h-screen">
    <IconSprite />

    <div class="sheet">
      <template v-if="targetKin !== null">
        <section class="section" :data-seal="sealColor(safeSealIndex)">
          <div class="archframe" aria-hidden="true"><img :src="dividerSrc" alt="" width="1536" height="1024" decoding="async" /></div>
          <div class="section__eyebrow">紋章や音を超えた、あなたへの言葉</div>
          <h1 class="section__title" style="font-family: 'Shippori Mincho', serif;">KIN{{ targetKin }}のあなたへ</h1>

          <p v-if="kinLetterFree" class="kinletter">{{ kinLetterFree }}</p>
          <p v-else-if="!pending" class="kinletter">このKINの解説文は現在準備中です。</p>
          <LockedVeil v-if="kinLetterLocked" class="kinletter-gate" :to="signupRedirectTo" :remaining-chars="kinLetterRest.length" />

          <div v-if="kinCelebrities.length" class="block">
            <div class="block__head"><svg><use href="#i-trophy" /></svg><h3>同じKINを持つ有名人</h3></div>
            <ul class="celeblist celeblist--kin">
              <li v-for="c in kinCelebrities" :key="c.name + c.birthdate">
                {{ c.name }}<span>{{ c.field }}<template v-if="formatCelebrityBirth(c.birthdate)"> ｜ {{ formatCelebrityBirth(c.birthdate) }}</template></span>
              </li>
            </ul>
          </div>
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
          <div class="section__eyebrow">KIN番号のあなたへ</div>
          <h1 class="font-display section__title">KIN番号が見つかりません</h1>
          <p class="text-center" style="color: var(--ink-soft);">指定されたKIN番号が見つかりませんでした。</p>
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
