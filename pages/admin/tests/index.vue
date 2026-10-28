<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { questionCount, type AchievementTestDoc } from '~/utils/achievementTest'
import { TEST_BAND_COUNT, normalizeFeedback } from '~/utils/achievementTestFeedback'
import { SEALS, sealColor } from '~/utils/mayaData'

definePageMeta({ layout: 'admin' })

// 到達度診断テスト管理。タブで「出題文」と「結果表示」を切り替える(2026-10-28、要望でここに集約。それまで結果表示の
// 設定は単独のページ /admin/test-settings だった)。
//   出題文:   問題(achievementTests/{sealIndex})の一覧。紋章は 20 固定なので SEALS から行を作り、問題数・更新日を重ねる。
//   結果表示: 全紋章共通の段階・購入カード(components/AdminTestDisplaySettings.vue)と、紋章ごとのフィードバック文
//             (achievementFeedback/{sealIndex})の入力状況の一覧。
// どちらのタブでも行を押すと /admin/tests/[sealIndex] の同じタブが開く。
const TABS = [
  { key: 'questions', label: '出題文' },
  { key: 'result', label: '結果表示' }
]
const route = useRoute()
const tab = computed(() => (route.query.tab === 'result' ? 'result' : 'questions'))

interface Row {
  sealIndex: number
  name: string
  color: string
  questions: number | null
  updated: string
  feedbackFilled: number | null
  feedbackUpdated: string
}

const FEEDBACK_TOTAL = 5 * TEST_BAND_COUNT
const COLOR_LABEL: Record<string, string> = { red: '赤', white: '白', blue: '青', yellow: '黄' }
const rows = ref<Row[]>(SEALS.map((s, i) => ({
  sealIndex: i, name: s.name, color: COLOR_LABEL[sealColor(i)], questions: null, updated: '—', feedbackFilled: null, feedbackUpdated: '—'
})))
const loadError = ref('')
// 行は SEALS から先に作れるが、問題数・更新日が届くまでは「未登録」に見えてしまうので、届くまで覆う。
const loading = ref(true)
useLoadingWhile('admin-tests', () => loading.value)

function dateOf(ts: Timestamp | undefined) {
  return ts?.toDate ? ts.toDate().toISOString().slice(0, 10) : '—'
}

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const [tests, feedback] = await Promise.all([
      getDocs(collection($firestore as Firestore, 'achievementTests')),
      getDocs(collection($firestore as Firestore, 'achievementFeedback'))
    ])
    tests.forEach((d) => {
      const row = rows.value[Number(d.id)]
      if (!row) return
      const data = d.data() as AchievementTestDoc & { updatedAt?: Timestamp }
      row.questions = questionCount(data)
      row.updated = dateOf(data.updatedAt)
    })
    feedback.forEach((d) => {
      const row = rows.value[Number(d.id)]
      if (!row) return
      const data = d.data() as { feedback?: Record<string, unknown>; updatedAt?: Timestamp }
      row.feedbackFilled = Object.values(normalizeFeedback(data.feedback)).flat().filter((t) => t.trim()).length
      row.feedbackUpdated = dateOf(data.updatedAt)
    })
  } catch {
    loadError.value = '読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
})

function questionsLabel(r: Row) {
  return r.questions === null ? '未登録' : `${r.questions}問`
}
function feedbackLabel(r: Row) {
  return `${r.feedbackFilled ?? 0} / ${FEEDBACK_TOTAL}`
}
function editLink(r: Row) {
  return tab.value === 'result' ? `/admin/tests/${r.sealIndex}?tab=result` : `/admin/tests/${r.sealIndex}`
}
</script>

<template>
  <div>
    <!-- タイトルとタブはスクロールしても画面上部に固定する(2026-10-28。AdminSearchBar と同じ sticky の作り) -->
    <div class="sticky top-14 z-20 -mx-4 -mt-3 mb-3 bg-[#f4f5f3] px-4 pt-3 md:top-0 md:-mx-8 md:px-8 dark:bg-[#0e1512]">
      <h1 class="mb-2 text-xl font-bold">到達度診断テスト管理</h1>
      <AdminTabs :tabs="TABS" class="!mb-0" />
    </div>
    <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">
      <template v-if="tab === 'questions'">紋章ごとの自己診断(5カテゴリ × 5問)の問題文と配点を管理します</template>
      <template v-else>結果画面に出す段階の名前・一言と購入カード(全紋章共通)、紋章ごとのフィードバック文を管理します</template>
    </p>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <template v-if="tab === 'result'">
      <p class="mb-3 text-sm font-bold">全紋章共通の設定</p>
      <AdminTestDisplaySettings class="mb-8" />
      <p class="mb-1 text-sm font-bold">紋章ごとのフィードバック文</p>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">5カテゴリ × 4段階 = {{ FEEDBACK_TOTAL }}本のうち、入力済みの本数です。紋章を押すと編集できます。</p>
    </template>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <!-- lg 未満はテーブルの代わりにカード一覧。タップで編集画面へ(AdminRecordCard 参照) -->
      <ul class="lg:hidden">
        <AdminRecordCard
          v-for="r in rows"
          :key="r.sealIndex"
          :title="r.name"
          :subtitle="`${r.color}い紋章`"
          :fields="tab === 'result'
            ? [{ label: 'フィードバック文', value: feedbackLabel(r) }, { label: '更新日', value: r.feedbackUpdated }]
            : [{ label: '問題数', value: questionsLabel(r) }, { label: '更新日', value: r.updated }]"
          :to="editLink(r)"
        />
      </ul>
      <div class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">紋章</th><th class="pb-2.5 pr-3">色</th>
              <th class="pb-2.5 pr-3 text-right">{{ tab === 'result' ? 'フィードバック文' : '問題数' }}</th><th class="pb-2.5">更新日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.sealIndex"
              class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              @click="navigateTo(editLink(r))"
            >
              <td class="py-2.5 pr-3 font-semibold">{{ r.name }}</td>
              <td class="py-2.5 pr-3">{{ r.color }}</td>
              <template v-if="tab === 'result'">
                <td class="py-2.5 pr-3 text-right tabular-nums" :class="(r.feedbackFilled ?? 0) < FEEDBACK_TOTAL ? 'text-red-600 dark:text-red-400' : ''">{{ feedbackLabel(r) }}</td>
                <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.feedbackUpdated }}</td>
              </template>
              <template v-else>
                <td class="py-2.5 pr-3 text-right tabular-nums" :class="r.questions === null ? 'text-red-600 dark:text-red-400' : ''">{{ questionsLabel(r) }}</td>
                <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
