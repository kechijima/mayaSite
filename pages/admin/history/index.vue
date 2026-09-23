<script setup lang="ts">
import { collection, getDocs, limit, orderBy, query, startAfter, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import { buildHistoryRow, formatDateTime, historyTypeChipClass, historyTypeLabel, type HistoryDoc, type HistoryRow } from '~/utils/diagnosisHistoryAdmin'

definePageMeta({ layout: 'admin' })

const PAGE_SIZE = 100

// Cursor-based pagination: pagesCache[i] holds the already-fetched rows for page i (so paging
// back never re-fetches), cursors[i] is the doc to startAfter to fetch page i, and
// pageHasNext[i] tells whether page i has a next page — determined by asking for PAGE_SIZE+1
// docs and checking whether the extra one came back, rather than a separate count query.
const pagesCache = ref<HistoryRow[][]>([])
const cursors = ref<(QueryDocumentSnapshot<DocumentData> | null)[]>([null])
const pageHasNext = ref<boolean[]>([])
const currentPage = ref(0)
const loading = ref(false)
const loadError = ref('')

async function loadPage(index: number) {
  if (pagesCache.value[index]) {
    currentPage.value = index
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const { $firestore } = useNuxtApp()
    const base = collection($firestore as Firestore, 'diagnosisHistory')
    const cursor = cursors.value[index]
    const constraints = [orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE + 1)]
    const snap = await getDocs(query(base, ...constraints))
    const docs = snap.docs
    pageHasNext.value[index] = docs.length > PAGE_SIZE
    const pageDocs = docs.slice(0, PAGE_SIZE)
    pagesCache.value[index] = pageDocs.map((d) => buildHistoryRow(d.id, d.data() as HistoryDoc))
    if (pageDocs.length) cursors.value[index + 1] = pageDocs[pageDocs.length - 1]
    currentPage.value = index
  } catch {
    loadError.value = '診断履歴の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
}

onMounted(() => loadPage(0))

const rows = computed(() => pagesCache.value[currentPage.value] ?? [])
function nextPage() {
  if (pageHasNext.value[currentPage.value]) loadPage(currentPage.value + 1)
}
function prevPage() {
  if (currentPage.value > 0) loadPage(currentPage.value - 1)
}

// 詳細は /admin/history/[id](2026-09-23 にモーダルからページへ)。
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">診断履歴</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">通常診断・相性診断の送信履歴を確認できます</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <!-- lg 未満はテーブルの代わりにカード一覧。タップで詳細モーダル(AdminRecordCard 参照) -->
      <ul class="lg:hidden">
        <li v-if="!loading && !rows.length" class="py-6 text-center text-[13px] text-slate-400">診断履歴はまだありません</li>
        <AdminRecordCard
          v-for="r in rows"
          :key="r.id"
          :title="r.primaryName"
          :subtitle="formatDateTime(r.createdAt)"
          :fields="[
            { label: '生年月日', value: r.birthdate },
            { label: '性別', value: r.gender },
            { label: '太陽の紋章', value: r.sealName }
          ]"
          :to="`/admin/history/${r.id}`"
        >
          <template #badge>
            <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="historyTypeChipClass(r.type)">{{ historyTypeLabel(r.type) }}</span>
          </template>
        </AdminRecordCard>
      </ul>
      <div class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">種別</th><th class="pb-2.5 pr-3">名前</th><th class="pb-2.5 pr-3">生年月日</th><th class="pb-2.5 pr-3">性別</th><th class="pb-2.5 pr-3">太陽の紋章</th><th class="pb-2.5 pr-3">診断日時</th><th class="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td colspan="7" class="py-6 text-center text-slate-400">診断履歴はまだありません</td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3"><span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="historyTypeChipClass(r.type)">{{ historyTypeLabel(r.type) }}</span></td>
              <td class="py-2.5 pr-3">{{ r.primaryName }}</td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ r.birthdate }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ r.gender }}</td>
              <td class="py-2.5 pr-3">{{ r.sealName }}</td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ formatDateTime(r.createdAt) }}</td>
              <td class="py-2.5"><NuxtLink :to="`/admin/history/${r.id}`" class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">詳細</NuxtLink></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-4 flex items-center justify-between text-sm">
        <button
          class="rounded-lg border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40 dark:border-slate-700"
          :disabled="currentPage === 0 || loading"
          @click="prevPage"
        >
          前へ
        </button>
        <span class="text-slate-500 dark:text-slate-400">ページ {{ currentPage + 1 }}</span>
        <button
          class="rounded-lg border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40 dark:border-slate-700"
          :disabled="!pageHasNext[currentPage] || loading"
          @click="nextPage"
        >
          次へ
        </button>
      </div>
    </div>
  </div>
</template>
