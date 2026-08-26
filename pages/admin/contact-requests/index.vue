<script setup lang="ts">
import { collection, getDocs, limit, orderBy, query, startAfter, type DocumentData, type Firestore, type QueryDocumentSnapshot } from 'firebase/firestore'
import type { ContactRequestDoc } from '~/composables/useContactRequests'
import { buildContactRequestRow, type ContactRequestRow } from '~/utils/contactRequestsAdmin'
import { formatDateTime } from '~/utils/diagnosisHistoryAdmin'

definePageMeta({ layout: 'admin' })

const PAGE_SIZE = 100

// admin/history/index.vue と同じカーソル方式のページネーション(pagesCache[i]/cursors[i]/
// pageHasNext[i]の役割もそちらと同じ)。
const pagesCache = ref<ContactRequestRow[][]>([])
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
    const base = collection($firestore as Firestore, 'contactRequests')
    const cursor = cursors.value[index]
    const constraints = [orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE_SIZE + 1)]
    const snap = await getDocs(query(base, ...constraints))
    const docs = snap.docs
    pageHasNext.value[index] = docs.length > PAGE_SIZE
    const pageDocs = docs.slice(0, PAGE_SIZE)
    pagesCache.value[index] = pageDocs.map((d) => buildContactRequestRow(d.id, d.data() as ContactRequestDoc))
    if (pageDocs.length) cursors.value[index + 1] = pageDocs[pageDocs.length - 1]
    currentPage.value = index
  } catch {
    loadError.value = 'お申し込み一覧の読み込みに失敗しました。時間をおいて再度お試しください。'
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
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">有料プラン申し込み</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">決済未実装のため /checkout で預かった連絡先の一覧です</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">名前</th><th class="pb-2.5 pr-3">性別</th><th class="pb-2.5 pr-3">電話番号</th><th class="pb-2.5 pr-3">メールアドレス</th><th class="pb-2.5">送信日時</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td colspan="5" class="py-6 text-center text-slate-400">お申し込みはまだありません</td>
            </tr>
            <tr v-for="r in rows" :key="r.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3">{{ r.name }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ r.gender }}</td>
              <td class="py-2.5 pr-3 tabular-nums">{{ r.phone }}</td>
              <td class="py-2.5 pr-3">{{ r.email }}</td>
              <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ formatDateTime(r.createdAt) }}</td>
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
