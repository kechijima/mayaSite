<script setup lang="ts">
import { type Firestore } from 'firebase/firestore'
import dividerSrc from '~/assets/images/optimized/divider.webp'
import { fetchPublishedDoc, fetchPremiumDoc } from '~/composables/useDiagnosisContent'
import { destinyKins, kinInfo, parseKin } from '~/utils/mayaCalc'
import { sealColor } from '~/utils/mayaData'
import { formatCelebrityBirth } from '~/utils/kinCelebrities'

// result.vueの「運命数字」セクション(同じKIN/前のKIN/次のKIN/鏡の向こうの自分KIN/絶対反対KIN)
// から遷移してくる、任意のKIN番号(1-260)単体の解説ページ。中身はresult.vue自身の
// 「KIN{n}のあなたへ」セクション(kinText/kinCelebrities、diagnosisContentのkin-{n}ドキュメント)
// と同じデータ・同じ有料/無料の切り方を、閲覧者本人の生まれKINではなく指定されたKINに対して
// 再現する。

const route = useRoute()
// 有料エリアの解放条件は composables/useEntitlement.ts に集約している(pages/result.vueと同じ)。
// entitlementSettled は
// 認証復元とusersドキュメント取得の両方が終わったかを表し、LockedVeilはこれが立つまで
// 出さない — 所属済みの会員に読み込み中の一瞬だけ購入訴求が見えるのを避けるため。
const { entitled: deepUnlocked, settled: entitlementSettled } = useEntitlement()

const targetKin = computed(() => parseKin(route.params.kin))
// 遷移元の診断結果ページのKIN(result.vue の運命数字リンクが ?from= に付ける)。
// このページのKINが本当に from の運命数字5つのどれかである場合だけ採用する — URLは書き換え
// られるので、検証しないと「購入したKINから来た」ことを装って無関係なKINを開けてしまう。
// 決済導入後は「from のKINを単体購入済みなら、このページも解放」の判定に使う。現在は
// 購入プラン選択(/plans)にどのKINの記事を案内するかにだけ使っている。
const sourceKin = computed(() => {
  const from = parseKin(route.query.from)
  return from !== null && targetKin.value !== null && destinyKins(from).includes(targetKin.value) ? from : null
})
// 有料エリアのLockedVeilに渡す遷移先 = 購入プラン選択。単体購入の案内は遷移元のKIN、
// 直接開いた場合はこのKIN自体(KIN N の単体購入で /kin/N/detail も読めるため)。
const plansLink = usePlansLink(() => sourceKin.value ?? targetKin.value)
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
    const firestore = $firestore as Firestore
    const free = await fetchPublishedDoc(firestore, `kin-${targetKin.value}`)
    if (!free) return null
    // 有料側は権限がある時だけ取りに行く(pages/result.vue・useDiagnosisContentと同じ方針)。
    const premium = deepUnlocked.value
      ? await fetchPremiumDoc(firestore, `kin-${targetKin.value}`)
      : null
    return { free, restText: premium?.restText || null }
  },
  { server: false, lazy: true, watch: [targetKin, deepUnlocked] }
)

// result.vueと同じ扱い。有料項目の分離後、freeText には既に冒頭125文字までしか
// 入っておらず(残りは diagnosisContentPremium の restText)、表示側で切る必要はない。
// 続きの有無は無料側の hasMore、続きの本文は権限がある時だけ届く restText で判断する。
const kinText = computed(() => kinDoc.value?.free.freeText || null)
const kinRestText = computed(() => kinDoc.value?.restText || null)
const kinPremiumChars = computed(() => kinDoc.value?.free.premiumCharCount ?? 0)
const kinLetterLocked = computed(() => !!kinDoc.value?.free.hasMore && !kinRestText.value)
const kinLetterFree = computed(() => {
  if (!kinText.value) return ''
  // 権限があれば分割前の原文をそのまま復元する(splitKinTextはtrimしていない)。
  if (!kinLetterLocked.value) return kinRestText.value ? `${kinText.value}${kinRestText.value}` : kinText.value
  return `${kinText.value.trimEnd()}…`
})

// 有名人一覧は本文の有料/無料を問わず常時無料(result.vueと同じ扱い)。
const kinCelebrities = computed(() => kinDoc.value?.free.kinCelebrities ?? [])
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
          <LockedVeil v-if="entitlementSettled && kinLetterLocked" class="kinletter-gate" :to="plansLink" :total-chars="kinPremiumChars" />

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
