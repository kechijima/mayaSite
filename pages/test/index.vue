<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { CATEGORY_MAX_SCORE, TEST_CATEGORY_KEYS, TEST_MAX_SCORE } from '~/utils/achievementTest'
import { fetchTestResults, formatTestDateTime } from '~/utils/achievementTestResults'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { SEALS } from '~/utils/mayaData'

// 到達度診断テストの入口。本人の太陽の紋章(登録した生年月日から算出)を示し、これまでの結果を出す。
// 受けられるのはチーム会員と有料会員(composables/useTestAccess.ts)。回数の制限はない。
// 対象は太陽の紋章のみ(2026-09-29 の合意)。ウェイブスペルなど他の紋章は今は受けられない。
const { access, user, profile, loginLink, accountLink } = useTestAccess()

const sunSeal = computed(() => {
  const birthdate = profile.value?.birthdate
  if (!birthdate) return null
  try {
    const { birth } = diagnoseBirthdate(birthdate)
    return { index: birth.sealIndex, name: SEALS[birth.sealIndex].name, kin: birth.kin }
  } catch {
    return null
  }
})

const { data: results, pending: loadingResults } = useAsyncData(
  'test-results-self',
  async () => {
    if (access.value !== 'ok' || !user.value) return []
    const { $firestore } = useNuxtApp()
    return fetchTestResults($firestore as Firestore, user.value.uid)
  },
  { server: false, lazy: true, watch: [access] }
)
useLoadingWhile('test-results', () => loadingResults.value)
const latest = computed(() => results.value?.[0] ?? null)
const CATEGORY_NAME: Record<string, string> = { thinking: '思考', action: '行動', relationship: '人間関係', belief: '信念', skill: 'スキル' }
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">到達度診断テスト</h1>
        <p class="masthead__sub">あなたの紋章らしさがどこまで身についているか、25問の自己診断で確かめます。</p>
      </div>

      <div class="mx-auto mt-10 max-w-[560px] space-y-4">
        <TestAccessNotice :access="access" :login-link="loginLink" :account-link="accountLink" />

        <template v-if="access === 'ok'">
          <section class="panel panel--plan" :class="{ 'text-center': !sunSeal }">
            <p class="formlabel">あなたの太陽の紋章</p>
            <template v-if="sunSeal">
              <p class="text-[20px] font-bold">{{ sunSeal.name }}<span class="ml-2 text-[12.5px] font-normal" style="color: var(--ink-soft);">KIN {{ sunSeal.kin }}</span></p>
              <p class="mt-1 text-[12.5px] leading-[1.8]" style="color: var(--ink-soft);">
                思考・行動・人間関係・信念・スキルの5つの面から、それぞれ5問ずつ「そう思う / どちらでもない / 思わない」で答えます。合計100点満点、何度でも受けられます。「どちらでもない」が5つ以上になると、その数だけ減点されます。
              </p>
              <NuxtLink to="/test/take" class="btn-gold mt-5 w-full">{{ results?.length ? 'もう一度受ける' : '受ける' }}</NuxtLink>
            </template>
            <template v-else>
              <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">生年月日が登録されていないため紋章を求められません。</p>
              <NuxtLink to="/account" class="btn-outline">マイページで登録する</NuxtLink>
            </template>
          </section>

          <section class="panel">
            <p class="formlabel">これまでの結果</p>
            <template v-if="loadingResults" />
            <p v-else-if="!results?.length" class="text-[13px]" style="color: var(--ink-faint);">まだ受けていません。</p>
            <template v-else>
              <div v-if="latest" class="testscore">
                <p class="testscore__total"><strong>{{ latest.total }}</strong><small>／{{ TEST_MAX_SCORE }}点</small></p>
                <p class="testscore__meta">最新 {{ formatTestDateTime(latest.takenAt) }}・{{ latest.sealName }}</p>
                <ul class="testbars">
                  <li v-for="key in TEST_CATEGORY_KEYS" :key="key">
                    <span class="testbars__label">{{ CATEGORY_NAME[key] }}</span>
                    <span class="testbars__track"><i :style="{ width: `${(latest.categoryScores[key] / CATEGORY_MAX_SCORE) * 100}%` }" /></span>
                    <span class="testbars__value">{{ Math.round((latest.categoryScores[key] / CATEGORY_MAX_SCORE) * 100) }}%</span>
                  </li>
                </ul>
              </div>
              <ul v-if="results.length > 1" class="testhistory">
                <li v-for="r in results.slice(1)" :key="r.id">
                  <span>{{ formatTestDateTime(r.takenAt) }}</span>
                  <span>{{ r.sealName }}</span>
                  <span class="testhistory__total">{{ r.total }}点</span>
                </li>
              </ul>
            </template>
          </section>
        </template>

        <NuxtLink to="/account" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          マイページへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
