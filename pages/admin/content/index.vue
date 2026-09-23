<script setup lang="ts">
import { collection, getDocs, type Firestore } from 'firebase/firestore'
import { CONTENT_TYPES, CHARACTER_PROFILE_FIELDS, TONE_PROFILE_FIELDS, buildContentRows, typeLabel, type ContentRow, type ContentType } from '~/utils/diagnosisContentAdmin'

definePageMeta({ layout: 'admin' })

const rows = ref<ContentRow[]>(buildContentRows())
const loadError = ref('')

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDocs(collection($firestore as Firestore, 'diagnosisContent'))
    const byId = new Map(rows.value.map((r) => [r.id, r]))
    snap.forEach((docSnap) => {
      const row = byId.get(docSnap.id)
      if (!row) return
      const data = docSnap.data() as Partial<ContentRow>
      row.name = data.name || row.name
      row.freeText = data.freeText ?? ''
      row.premiumText = data.premiumText ?? ''
      row.status = data.status ?? '下書き'
      row.updated = (data as any).updatedAt?.toDate ? (data as any).updatedAt.toDate().toISOString().slice(0, 10) : row.updated
      if (row.type === 'character') {
        for (const f of CHARACTER_PROFILE_FIELDS) row[f.key] = data[f.key] ?? ''
      }
      if (row.type === 'tone') {
        for (const f of TONE_PROFILE_FIELDS) row[f.key] = data[f.key] ?? ''
      }
    })
  } catch {
    loadError.value = 'コンテンツの読み込みに失敗しました。時間をおいて再度お試しください。'
  }
})

// 検索と絞り込み。Firestore からは全件(20+13+260)取得済みなので、クライアント側で絞る。
const keyword = ref('')
const typeFilter = ref<'all' | ContentType>('all')
const statusFilter = ref<'all' | ContentRow['status']>('all')
const TYPE_FILTER_OPTIONS = [{ value: 'all', label: 'すべて' }, ...CONTENT_TYPES.map((t) => ({ value: t.type, label: t.label }))]
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  { value: '公開', label: '公開' },
  { value: '下書き', label: '下書き' }
]
const activeFilters = computed(() => (typeFilter.value === 'all' ? 0 : 1) + (statusFilter.value === 'all' ? 0 : 1))
function resetFilters() {
  typeFilter.value = 'all'
  statusFilter.value = 'all'
}
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (typeFilter.value !== 'all' && r.type !== typeFilter.value) return false
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (!kw) return true
    return r.name.toLowerCase().includes(kw) || typeLabel(r.type).includes(kw)
  })
})

// スマホのカード一覧は ADMIN_MOBILE_PAGE_SIZE 件ずつ継ぎ足す(全件を一度に描画しない)。
// PC のテーブルは従来どおり全件。絞り込みが変わったら先頭から出し直す。
const visibleCount = ref(ADMIN_MOBILE_PAGE_SIZE)
const visibleCards = computed(() => filtered.value.slice(0, visibleCount.value))
const { sentinel, fill } = useInfiniteScroll({
  hasMore: () => visibleCount.value < filtered.value.length,
  loadMore: () => {
    visibleCount.value += ADMIN_MOBILE_PAGE_SIZE
  }
})
watch(filtered, () => {
  visibleCount.value = ADMIN_MOBILE_PAGE_SIZE
  nextTick(fill)
})

function charCount(text: string) {
  return text ? `${text.length}字` : '—'
}

function openRow(id: string) {
  navigateTo(`/admin/content/${id}`)
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">診断コンテンツ管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">キャラクター(紋章)・銀河の音の診断文言を管理します</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <AdminSearchBar v-model="keyword" placeholder="紋章名・音名・KIN番号で検索" :active-filters="activeFilters" @reset="resetFilters">
      <AdminFilterChips v-model="typeFilter" label="種別" :options="TYPE_FILTER_OPTIONS" />
      <AdminFilterChips v-model="statusFilter" label="ステータス" :options="STATUS_FILTER_OPTIONS" />
    </AdminSearchBar>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p v-if="!filtered.length" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">条件に一致するコンテンツはありません。</p>
      <!-- lg 未満はテーブルの代わりにカード一覧。タップで編集画面へ(AdminRecordCard 参照) -->
      <ul v-else class="lg:hidden">
        <AdminRecordCard
          v-for="r in visibleCards"
          :key="r.id"
          :title="r.name"
          :subtitle="typeLabel(r.type)"
          :fields="[
            { label: '無料エリア', value: charCount(r.freeText) },
            { label: '有料エリア', value: charCount(r.premiumText) },
            { label: '更新日', value: r.updated }
          ]"
          :to="`/admin/content/${r.id}`"
        >
          <template #badge>
            <span
              class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
              :class="r.status === '公開' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
            >{{ r.status }}</span>
          </template>
        </AdminRecordCard>
      <!-- 継ぎ足しの番兵(useInfiniteScroll)。この <ul> は lg 未満だけ表示される -->
      <li ref="sentinel" aria-hidden="true" />
      <li v-if="visibleCount < filtered.length" class="py-4 text-center text-[13px] text-slate-400">読み込み中…</li>
      </ul>
      <div v-if="filtered.length" class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">種別</th><th class="pb-2.5 pr-3">名称</th><th class="pb-2.5 pr-3 text-right">無料エリア文字数</th><th class="pb-2.5 pr-3 text-right">有料エリア文字数</th><th class="pb-2.5 pr-3">ステータス</th><th class="pb-2.5">更新日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in filtered"
              :key="r.id"
              class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              @click="openRow(r.id)"
            >
              <td class="py-2.5 pr-3">{{ typeLabel(r.type) }}</td>
              <td class="py-2.5 pr-3">{{ r.name }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ charCount(r.freeText) }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ charCount(r.premiumText) }}</td>
              <td class="py-2.5 pr-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                  :class="r.status === '公開' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                >{{ r.status }}</span>
              </td>
              <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
