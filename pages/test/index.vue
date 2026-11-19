<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { CATEGORY_MAX_SCORE, TEST_CATEGORY_KEYS, TEST_MAX_SCORE } from '~/utils/achievementTest'
import { fetchTestResults, formatTestDateTime } from '~/utils/achievementTestResults'
import { SEALS } from '~/utils/mayaData'

// ピッタリ到達度テストの入口。太陽の紋章を示し、これまでの結果を出す。回数の制限はない。
// 対象は太陽の紋章のみ(2026-09-29 の合意)。
// 2026-11-19: 全員に開放(composables/useTestAccess.ts)。
//   - 会員: 登録した生年月日の太陽の紋章。結果の記録が残る。チーム会員・有料会員以外は点数をぼかす
//   - 未ログイン: 診断結果から渡された ?kin= の太陽の紋章。記録は残らない
const { access, locked, canSave, seal, sealQuery, user, loginLink, signupLink, plansLink } = useTestAccess()

const sunSeal = computed(() => (seal.value ? { index: seal.value.sealIndex, name: SEALS[seal.value.sealIndex].name, kin: seal.value.kin } : null))
const archetype = useSealArchetype(computed(() => sunSeal.value?.index ?? null))
const startable = computed(() => access.value !== 'loading' && access.value !== 'suspended' && !!seal.value)

const { data: results, pending: loadingResults } = useAsyncData(
  'test-results-self',
  async () => {
    if (!canSave.value || !user.value) return []
    const { $firestore } = useNuxtApp()
    return fetchTestResults($firestore as Firestore, user.value.uid)
  },
  { server: false, lazy: true, watch: [access] }
)
useLoadingWhile('test-results', () => canSave.value && loadingResults.value)
const latest = computed(() => results.value?.[0] ?? null)
const CATEGORY_NAME: Record<string, string> = { thinking: '思考', action: '行動', relationship: '人間関係', belief: '信念', skill: 'スキル' }
// ぼかすときの見せかけの棒の長さ(本当の値は DOM に出さない)
const DUMMY_PERCENTS = [70, 40, 90, 60, 50]
</script>

<template>
  <div class="paper-page paper-page--focus paper-page--header">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">ピッタリ到達度テスト</h1>
        <p class="masthead__sub">あなたの紋章らしさがどこまで身についているか、25問の自己診断で確かめます。</p>
      </div>

      <div class="mx-auto mt-10 max-w-[560px] space-y-4">
        <TestAccessNotice :access="access" :seal="seal" :login-link="loginLink" />

        <template v-if="startable && sunSeal">
          <section class="panel panel--plan">
            <p class="formlabel">あなたの太陽の紋章</p>
            <!-- 紋章名とタイプ名を大きく(2026-11-19 要望) -->
            <p class="testseal testseal--left">
              <span class="testseal__name">{{ sunSeal.name }}</span>
              <span v-if="archetype" class="testseal__type">{{ archetype }}</span>
              <span class="testseal__kin">KIN {{ sunSeal.kin }}</span>
            </p>
            <p class="mt-1 text-[12.5px] leading-[1.8]" style="color: var(--ink-soft);">
              思考・行動・人間関係・信念・スキルの5つの面から、それぞれ5問ずつ「そう思う / どちらでもない / 思わない」で答えます。合計100点満点、何度でも受けられます。「どちらでもない」が5つ以上になると、その数だけ減点されます。
            </p>
            <NuxtLink :to="{ path: '/test/take', query: sealQuery }" class="btn-gold mt-5 w-full">{{ results?.length ? 'もう一度受ける' : '受ける' }}</NuxtLink>
            <p v-if="access === 'guest'" class="mt-3 text-center text-[12px] leading-[1.8]" style="color: var(--ink-faint);">
              ログインせずに受けた結果は記録されません。<br class="sm:hidden" /><NuxtLink :to="signupLink" class="underline">無料会員登録</NuxtLink>・<NuxtLink :to="loginLink" class="underline">ログイン</NuxtLink>すると結果が残ります。
            </p>
            <p v-else-if="locked" class="mt-3 text-center text-[12px] leading-[1.8]" style="color: var(--ink-faint);">
              点数とフィードバックは<NuxtLink :to="plansLink" class="underline">有料会員</NuxtLink>の方がご覧いただけます。
            </p>
          </section>

          <section v-if="canSave" class="panel">
            <p class="formlabel">これまでの結果</p>
            <template v-if="loadingResults" />
            <p v-else-if="!results?.length" class="text-[13px]" style="color: var(--ink-faint);">まだ受けていません。</p>
            <template v-else>
              <div v-if="latest" class="testscore" :class="{ 'is-locked': locked }">
                <p class="testscore__total"><strong>{{ locked ? '??' : latest.total }}</strong><small>／{{ TEST_MAX_SCORE }}点</small></p>
                <p class="testscore__meta">最新 {{ formatTestDateTime(latest.takenAt) }}・{{ latest.sealName }}</p>
                <ul class="testbars">
                  <li v-for="(key, i) in TEST_CATEGORY_KEYS" :key="key">
                    <span class="testbars__label">{{ CATEGORY_NAME[key] }}</span>
                    <span class="testbars__track"><i :style="{ width: `${locked ? DUMMY_PERCENTS[i] : (latest.categoryScores[key] / CATEGORY_MAX_SCORE) * 100}%` }" /></span>
                    <span class="testbars__value">{{ locked ? '??' : Math.round((latest.categoryScores[key] / CATEGORY_MAX_SCORE) * 100) }}%</span>
                  </li>
                </ul>
                <NuxtLink :to="`/test/result/${latest.id}`" class="btn-outline mt-4 w-full">結果とフィードバックを見る</NuxtLink>
              </div>
              <!-- 各行はその回の結果ページ(/test/result/[id])へのリンク -->
              <ul v-if="results.length > 1" class="testhistory">
                <li v-for="r in results.slice(1)" :key="r.id">
                  <NuxtLink :to="`/test/result/${r.id}`">
                    <span>{{ formatTestDateTime(r.takenAt) }}</span>
                    <span>{{ r.sealName }}</span>
                    <span class="testhistory__total">{{ locked ? '??' : r.total }}点 ›</span>
                  </NuxtLink>
                </li>
              </ul>
            </template>
          </section>
        </template>

        <NuxtLink v-if="canSave" to="/account" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          マイページへ戻る
        </NuxtLink>
        <NuxtLink v-else to="/" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
