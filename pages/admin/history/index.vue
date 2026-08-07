<script setup lang="ts">
import { collection, getDocs, limit, orderBy, query, startAfter, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import { buildHistoryRow, formatDateTime, historyTypeChipClass, historyTypeLabel, type HistoryDoc, type HistoryRow } from '~/utils/diagnosisHistoryAdmin'
import { genderLabel } from '~/utils/gender'

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

const selected = ref<HistoryRow | null>(null)
function openDetail(row: HistoryRow) {
  selected.value = row
}
function closeDetail() {
  selected.value = null
}
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
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
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
              <td class="py-2.5"><button class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="openDetail(r)">詳細</button></td>
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

    <!-- Detail modal (read-only — history is an immutable log, no edit section) -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="closeDetail">
      <div class="w-full max-w-[560px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold">{{ historyTypeLabel(selected.type) }}</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ formatDateTime(selected.createdAt) }}</span>
          </div>
          <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="閉じる" @click="closeDetail">✕</button>
        </div>

        <div class="max-h-[60vh] space-y-4 overflow-y-auto">
          <div v-for="(p, i) in selected.people" :key="i" class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <p class="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              {{ selected.type === 'compatibility' ? (i === 0 ? 'あなた' : `相手${i}`) : p.name }}
              <span v-if="selected.type === 'compatibility'" class="ml-1 font-normal">（{{ p.name }}）</span>
            </p>
            <dl class="grid grid-cols-2 gap-y-2.5 text-[13px]">
              <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold">{{ p.birthdate }}</dd></div>
              <div><dt class="text-slate-400">性別</dt><dd class="font-semibold">{{ genderLabel(p.gender) }}</dd></div>
              <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">KIN {{ p.kin }}</dd></div>
              <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ p.sealName }}</dd></div>
              <div><dt class="text-slate-400">銀河の音</dt><dd class="font-semibold">{{ p.toneName }}</dd></div>
              <div><dt class="text-slate-400">ウェイブスペル</dt><dd class="font-semibold">{{ p.wavespellSealName }}</dd></div>
            </dl>
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="closeDetail">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>
