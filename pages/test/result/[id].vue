<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import { fetchTestResult, formatTestDateTime } from '~/utils/achievementTestResults'

definePageMeta({ middleware: 'member-auth' })

// ピッタリ到達度テストの過去の結果1回ぶん(2026-10-27)。/test の最新結果・履歴の行から開く。
// 見た目は受けた直後の結果画面(/test/take)と同じ components/TestResultSheet.vue。
// 結果ドキュメントは本人しか読めない(firestore.rules)。記録が残るのは会員だけなのでログイン必須。
// 無料会員の結果はぼかす(2026-11-19)。有料会員になれば過去の結果もそのまま見える。
const route = useRoute()
const id = computed(() => String(route.params.id ?? ''))
const { access, locked, canSave, user, profile, loginLink, plansLink } = useTestAccess()

const { data: row, pending } = useAsyncData(
  () => `test-result-${id.value}`,
  async () => {
    if (!canSave.value || !user.value || !id.value) return null
    try {
      return await fetchTestResult(useNuxtApp().$firestore as Firestore, user.value.uid, id.value)
    } catch {
      return null
    }
  },
  { server: false, lazy: true, watch: [access] }
)
useLoadingWhile('test-result', () => pending.value)
</script>

<template>
  <div class="paper-page paper-page--focus paper-page--header">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">ピッタリ到達度テスト</h1>
        <p v-if="row" class="masthead__sub"><strong>{{ row.sealName }}</strong>　{{ formatTestDateTime(row.takenAt) }} の結果</p>
      </div>

      <div class="mx-auto mt-8 max-w-[1000px] space-y-4">
        <TestAccessNotice v-if="access === 'suspended'" :access="access" :seal="null" :login-link="loginLink" />

        <template v-if="canSave && !pending">
          <TestResultSheet
            v-if="row"
            :seal-index="row.sealIndex"
            :seal-name="row.sealName"
            :gender="profile?.gender"
            :total="row.total"
            :category-scores="row.categoryScores"
            :locked="locked"
            :unlock-to="plansLink"
          />
          <section v-else class="panel text-center">
            <p class="text-[13.5px]" style="color: var(--ink-soft);">この結果は見つかりませんでした。</p>
          </section>
          <div class="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <NuxtLink to="/test/take" class="btn-gold">もう一度受ける</NuxtLink>
            <NuxtLink to="/test" class="btn-outline">結果一覧へ</NuxtLink>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
