<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { questionCount, type AchievementTestDoc } from '~/utils/achievementTest'
import { TEST_BAND_COUNT, normalizeFeedback } from '~/utils/achievementTestFeedback'
import { SEALS, sealColor } from '~/utils/mayaData'

definePageMeta({ layout: 'admin' })

// 到達度診断テスト管理。タブで「出題文」と「結果表示」を切り替える(2026-10-28、要望でここに集約)。
//   出題文:   紋章の一覧(問題数・更新日)。紋章を押すと、画面を移らずに一覧がその紋章の問題の編集に入れ替わる
//             (components/AdminTestQuestionsEditor.vue)。
//   結果表示: さらに［共通設定］［紋章ごと］(?sub=seal)。
//             共通設定 = 全紋章共通の段階・購入カード(components/AdminTestDisplaySettings.vue)
//             紋章ごと = 出題文と同じ形の一覧(フィードバック文の入力数・更新日)。押すとその紋章のフィードバック文の
//                        編集に入れ替わる(components/AdminFeedbackEditor.vue)。
// 選んだ紋章は ?seal=N に持つ(再読み込み・リンクで同じ紋章が開く)。「‹ 紋章一覧」で ?seal を外して一覧へ戻る。
// 編集中に未保存のまま離れようとすると確認を出す(composables/useUnsavedGuard.ts)。
// 2026-10-28 の経緯: 紋章の編集は別ページ(/admin/tests/[sealIndex]、今は転送のみ)→ 結果表示だけ2ペイン → 両タブとも
// 「一覧 ⇔ その場で詳細」にそろえた(要望)。
const TABS = [
  { key: 'questions', label: '出題文' },
  { key: 'result', label: '結果表示' }
]
const route = useRoute()
const router = useRouter()
const tab = computed(() => (route.query.tab === 'result' ? 'result' : 'questions'))
const SUBS = [
  { key: 'common', label: '共通設定' },
  { key: 'seal', label: '紋章ごとのフィードバック文' }
]
const sub = computed(() => (route.query.sub === 'seal' ? 'seal' : 'common'))
// 紋章を選ぶ画面か(結果表示の共通設定では紋章を使わない)
const usesSeals = computed(() => tab.value === 'questions' || sub.value === 'seal')
const selectedSeal = computed(() => {
  if (!usesSeals.value || route.query.seal === undefined) return null
  const n = Number(route.query.seal)
  return Number.isInteger(n) && n >= 0 && n < SEALS.length ? n : null
})

function setQuery(patch: Record<string, string | undefined>) {
  const query: Record<string, unknown> = { ...route.query, ...patch }
  for (const k of Object.keys(query)) if (query[k] === undefined) delete query[k]
  return router.replace({ query: query as Record<string, string> })
}
function selectSub(key: string) {
  setQuery({ sub: key === 'seal' ? 'seal' : undefined, seal: undefined })
}
async function openSeal(i: number) {
  await setQuery({ seal: String(i) })
  if (selectedSeal.value === i) window.scrollTo({ top: 0 })
}
function backToList() {
  setQuery({ seal: undefined })
}

interface Row {
  sealIndex: number
  name: string
  color: string
  questions: number | null
  updated: string
  feedbackFilled: number
  feedbackUpdated: string
}

const FEEDBACK_TOTAL = 5 * TEST_BAND_COUNT
const COLOR_LABEL: Record<string, string> = { red: '赤', white: '白', blue: '青', yellow: '黄' }
const rows = ref<Row[]>(SEALS.map((s, i) => ({
  sealIndex: i, name: s.name, color: COLOR_LABEL[sealColor(i)], questions: null, updated: '—', feedbackFilled: 0, feedbackUpdated: '—'
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

// 編集を保存したら一覧の数字も更新する(一覧に戻ったときに古い値が出ないように)
function onQuestionsSaved(i: number, questions: number) {
  rows.value[i].questions = questions
  rows.value[i].updated = new Date().toISOString().slice(0, 10)
}
function onFeedbackSaved(i: number, filled: number, updated: string) {
  rows.value[i].feedbackFilled = filled
  rows.value[i].feedbackUpdated = updated
}

function countLabel(r: Row) {
  if (tab.value === 'result') return `${r.feedbackFilled} / ${FEEDBACK_TOTAL}`
  return r.questions === null ? '未登録' : `${r.questions}問`
}
function countIncomplete(r: Row) {
  return tab.value === 'result' ? r.feedbackFilled < FEEDBACK_TOTAL : r.questions === null
}
function updatedLabel(r: Row) {
  return tab.value === 'result' ? r.feedbackUpdated : r.updated
}
const countHeader = computed(() => (tab.value === 'result' ? 'フィードバック文' : '問題数'))
const navBtn = 'rounded-md border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900'
</script>

<template>
  <div>
    <!-- タイトルとタブ(紋章を開いているときは紋章名と前後の移動も)はスクロールしても画面上部に固定する -->
    <div class="sticky top-14 z-20 -mx-4 -mt-3 mb-3 bg-[#f4f5f3] px-4 pt-3 md:top-0 md:-mx-8 md:px-8 dark:bg-[#0e1512]">
      <h1 class="mb-2 text-xl font-bold">到達度診断テスト管理</h1>
      <AdminTabs :tabs="TABS" class="!mb-0" />
      <div v-if="selectedSeal !== null" class="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-200 py-2.5 dark:border-slate-800">
        <button type="button" class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="backToList">‹ 紋章一覧</button>
        <p class="text-base font-bold">
          {{ SEALS[selectedSeal].name }}<span class="ml-1.5 text-[12px] font-semibold text-slate-500 dark:text-slate-400">{{ tab === 'result' ? 'のフィードバック文' : 'の出題文' }}</span>
        </p>
        <div class="ml-auto flex gap-1">
          <button type="button" :class="navBtn" :disabled="selectedSeal === 0" @click="openSeal(selectedSeal - 1)">‹ 前の紋章</button>
          <button type="button" :class="navBtn" :disabled="selectedSeal === SEALS.length - 1" @click="openSeal(selectedSeal + 1)">次の紋章 ›</button>
        </div>
      </div>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <!-- 結果表示の中の切り替え(共通設定 / 紋章ごと)。紋章を開いている間は出さない(「‹ 紋章一覧」で戻る) -->
    <div v-if="tab === 'result' && selectedSeal === null" class="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="結果表示の設定">
      <button
        v-for="s in SUBS"
        :key="s.key"
        type="button"
        role="tab"
        :aria-selected="sub === s.key"
        class="rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
        :class="sub === s.key ? 'bg-brass-700 text-white dark:bg-gold-300 dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
        @click="selectSub(s.key)"
      >{{ s.label }}</button>
    </div>

    <AdminTestDisplaySettings v-if="!usesSeals" />

    <!-- 紋章を開いているとき: 一覧と入れ替わって、その紋章の編集 -->
    <template v-else-if="selectedSeal !== null">
      <AdminFeedbackEditor
        v-if="tab === 'result'"
        :key="`feedback-${selectedSeal}`"
        :seal-index="selectedSeal"
        @saved="(filled, updated) => onFeedbackSaved(selectedSeal!, filled, updated)"
      />
      <AdminTestQuestionsEditor
        v-else
        :key="`questions-${selectedSeal}`"
        :seal-index="selectedSeal"
        @saved="(n) => onQuestionsSaved(selectedSeal!, n)"
      />
    </template>

    <!-- 紋章の一覧(出題文・結果表示で同じ形) -->
    <template v-else>
      <p class="mb-3 text-xs text-slate-500 dark:text-slate-400">
        <template v-if="tab === 'result'">5カテゴリ × 4段階 = {{ FEEDBACK_TOTAL }}本のうち、入力済みの本数です。紋章を押すとフィードバック文を編集できます。</template>
        <template v-else>紋章ごとの自己診断（5カテゴリ × 5問）の問題文と配点です。紋章を押すと編集できます。</template>
      </p>
      <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <!-- lg 未満はテーブルの代わりにカード一覧(AdminRecordCard 参照) -->
        <ul class="lg:hidden">
          <AdminRecordCard
            v-for="r in rows"
            :key="r.sealIndex"
            :title="r.name"
            :subtitle="`${r.color}い紋章`"
            :fields="[{ label: countHeader, value: countLabel(r) }, { label: '更新日', value: updatedLabel(r) }]"
            clickable
            @click="openSeal(r.sealIndex)"
          />
        </ul>
        <div class="hidden lg:block">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400 shadow-[inset_0_-1px_0_#e2e8f0] dark:shadow-[inset_0_-1px_0_#1e293b]">
                <th class="pb-2.5 pr-3">紋章</th><th class="pb-2.5 pr-3">色</th>
                <th class="pb-2.5 pr-3 text-right">{{ countHeader }}</th><th class="pb-2.5 pr-3">更新日</th><th class="w-6 pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="r in rows"
                :key="r.sealIndex"
                class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                @click="openSeal(r.sealIndex)"
              >
                <td class="py-2.5 pr-3 font-semibold">{{ r.name }}</td>
                <td class="py-2.5 pr-3">{{ r.color }}</td>
                <td class="py-2.5 pr-3 text-right tabular-nums" :class="countIncomplete(r) ? 'text-red-600 dark:text-red-400' : ''">{{ countLabel(r) }}</td>
                <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ updatedLabel(r) }}</td>
                <td class="py-2.5 text-right text-slate-400">›</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
