<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { questionCount, type AchievementTestDoc } from '~/utils/achievementTest'
import { SEALS, sealColor } from '~/utils/mayaData'

definePageMeta({ layout: 'admin' })

// 到達度診断テスト管理。タブで「出題文」と「結果表示」を切り替える(2026-10-28、要望でここに集約。それまで結果表示の
// 設定は単独のページ /admin/test-settings だった)。
//   出題文:   問題(achievementTests/{sealIndex})の一覧。紋章は 20 固定なので SEALS から行を作り、問題数・更新日を重ねる。
//   結果表示: さらに［共通設定］［紋章ごと］(?sub=seal)に分かれる。
//             共通設定 = 全紋章共通の段階・購入カード(components/AdminTestDisplaySettings.vue)
//             紋章ごと = 左に20紋章・右にその紋章のフィードバック文の2ペイン(components/AdminFeedbackBySeal.vue、2026-10-28)。
//             以前は共通設定の下に紋章一覧を置き、押すと /admin/tests/[sealIndex] へ移っていたが、遷移が分かりにくかった。
// 出題文タブの行を押すと /admin/tests/[sealIndex] が開く。
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
function selectSub(key: string) {
  const query = { ...route.query }
  if (key === 'seal') query.sub = 'seal'
  else {
    delete query.sub
    delete query.seal
  }
  router.replace({ query })
}

interface Row {
  sealIndex: number
  name: string
  color: string
  questions: number | null
  updated: string
}

const COLOR_LABEL: Record<string, string> = { red: '赤', white: '白', blue: '青', yellow: '黄' }
const rows = ref<Row[]>(SEALS.map((s, i) => ({ sealIndex: i, name: s.name, color: COLOR_LABEL[sealColor(i)], questions: null, updated: '—' })))
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
    const tests = await getDocs(collection($firestore as Firestore, 'achievementTests'))
    tests.forEach((d) => {
      const row = rows.value[Number(d.id)]
      if (!row) return
      const data = d.data() as AchievementTestDoc & { updatedAt?: Timestamp }
      row.questions = questionCount(data)
      row.updated = dateOf(data.updatedAt)
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
function editLink(r: Row) {
  return `/admin/tests/${r.sealIndex}`
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
      <!-- 結果表示の中の切り替え(共通設定 / 紋章ごと) -->
      <div class="mb-4 inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="tablist" aria-label="結果表示の設定">
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
      <AdminTestDisplaySettings v-if="sub === 'common'" />
      <AdminFeedbackBySeal v-else />
    </template>

    <div v-else class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <!-- lg 未満はテーブルの代わりにカード一覧。タップで編集画面へ(AdminRecordCard 参照) -->
      <ul class="lg:hidden">
        <AdminRecordCard
          v-for="r in rows"
          :key="r.sealIndex"
          :title="r.name"
          :subtitle="`${r.color}い紋章`"
          :fields="[{ label: '問題数', value: questionsLabel(r) }, { label: '更新日', value: r.updated }]"
          :to="editLink(r)"
        />
      </ul>
      <div class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">紋章</th><th class="pb-2.5 pr-3">色</th>
              <th class="pb-2.5 pr-3 text-right">問題数</th><th class="pb-2.5">更新日</th>
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
              <td class="py-2.5 pr-3 text-right tabular-nums" :class="r.questions === null ? 'text-red-600 dark:text-red-400' : ''">{{ questionsLabel(r) }}</td>
              <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
