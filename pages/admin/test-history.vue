<script setup lang="ts">
import type { DocumentData, Firestore, QueryDocumentSnapshot } from 'firebase/firestore'
import { TEST_MAX_SCORE } from '~/utils/achievementTest'
import {
  fetchTestResultUsers,
  fetchTestResultsPage,
  formatTestDateTime,
  type TestResultLogRow,
  type TestResultUserInfo
} from '~/utils/achievementTestResults'

definePageMeta({ layout: 'admin' })

// 到達度診断テストの受験履歴を全会員ぶん横断して新しい順に出す。答案(25問の回答)は
// 行を押した先のユーザー詳細(/admin/users/[uid])で見る。
// ページ送りの仕組みは /admin/history と同じ: PC は 100 件ずつ前へ/次へ、スマホは 20 件ずつ継ぎ足し。
// 会員の名前・メール・チームは結果に入っていないので、ページを読むたびに users から引いて重ねる。
const MOBILE_QUERY = '(max-width: 1023px)'
const isMobile = ref(false)
const pageSize = ref(100)

const pagesCache = ref<TestResultLogRow[][]>([])
const cursors = ref<(QueryDocumentSnapshot<DocumentData> | null)[]>([null])
const pageHasNext = ref<boolean[]>([])
const currentPage = ref(0)
const loading = ref(false)
useLoadingWhile('admin-test-history', () => loading.value)
const loadError = ref('')
const users = ref<Record<string, TestResultUserInfo>>({})

async function loadPage(index: number) {
  if (pagesCache.value[index]) {
    currentPage.value = index
    return
  }
  loading.value = true
  loadError.value = ''
  try {
    const { $firestore } = useNuxtApp()
    const db = $firestore as Firestore
    const { rows, hasNext, nextCursor } = await fetchTestResultsPage(db, pageSize.value, cursors.value[index])
    pageHasNext.value[index] = hasNext
    pagesCache.value[index] = rows
    if (nextCursor) cursors.value[index + 1] = nextCursor
    currentPage.value = index
    const missing = rows.map((r) => r.uid).filter((uid) => uid && !(uid in users.value))
    if (missing.length) Object.assign(users.value, await fetchTestResultUsers(db, missing))
  } catch (err) {
    // インデックス未作成(本番で firestore:indexes を流す前)は failed-precondition で返る。
    loadError.value = (err as { code?: string })?.code === 'failed-precondition'
      ? '受験履歴の索引がまだ用意されていません。`npx firebase deploy --only firestore:indexes` を実行し、作成が終わってから開き直してください。'
      : '受験履歴の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  isMobile.value = window.matchMedia(MOBILE_QUERY).matches
  pageSize.value = isMobile.value ? ADMIN_MOBILE_PAGE_SIZE : 100
  loadPage(0)
})

const rows = computed(() => (isMobile.value ? pagesCache.value.flat() : pagesCache.value[currentPage.value] ?? []))
const loadedPages = computed(() => pagesCache.value.length)
const mobileHasMore = computed(() => loadedPages.value > 0 && pageHasNext.value[loadedPages.value - 1] === true)
const { sentinel } = useInfiniteScroll({
  hasMore: () => !loading.value && mobileHasMore.value,
  loadMore: () => loadPage(loadedPages.value)
})
function nextPage() {
  if (pageHasNext.value[currentPage.value]) loadPage(currentPage.value + 1)
}
function prevPage() {
  if (currentPage.value > 0) loadPage(currentPage.value - 1)
}
function userOf(r: TestResultLogRow): TestResultUserInfo {
  return users.value[r.uid] ?? { name: '', email: '', teamName: '' }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">到達度診断テスト履歴</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">全会員の受験履歴を新しい順に確認できます。行を押すとその会員の詳細で答案を見られます</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <!-- lg 未満はテーブルの代わりにカード一覧。タップでユーザー詳細へ(AdminRecordCard 参照) -->
      <ul class="lg:hidden">
        <li v-if="!loading && !rows.length" class="py-6 text-center text-[13px] text-slate-400">受験履歴はまだありません</li>
        <AdminRecordCard
          v-for="r in rows"
          :key="r.id"
          :title="userOf(r).name || '—'"
          :subtitle="userOf(r).email"
          :fields="[
            { label: '受験日時', value: formatTestDateTime(r.takenAt) },
            { label: '紋章', value: r.sealName },
            { label: '所属チーム', value: userOf(r).teamName || '—' },
            { label: 'どちらでもない', value: `${r.neutralCount}（${r.penalty}点）` }
          ]"
          :to="`/admin/users/${r.uid}`"
        >
          <template #badge>
            <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-bold tabular-nums dark:bg-slate-800">{{ r.total }}／{{ TEST_MAX_SCORE }}点</span>
          </template>
        </AdminRecordCard>
        <!-- 無限スクロールの番兵(useInfiniteScroll)。この <ul> は lg 未満だけ表示される -->
        <li ref="sentinel" aria-hidden="true" />
        <li v-if="!loading && rows.length && !mobileHasMore" class="py-4 text-center text-[11.5px] text-slate-400">すべて表示しました</li>
      </ul>
      <div class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">受験日時</th><th class="pb-2.5 pr-3">名前</th><th class="pb-2.5 pr-3">メール</th><th class="pb-2.5 pr-3">所属チーム</th><th class="pb-2.5 pr-3">紋章</th><th class="pb-2.5 pr-3 text-right">総合点</th><th class="pb-2.5 text-right">どちらでもない</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && !rows.length">
              <td colspan="7" class="py-6 text-center text-slate-400">受験履歴はまだありません</td>
            </tr>
            <tr
              v-for="r in rows"
              :key="r.id"
              class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              @click="navigateTo(`/admin/users/${r.uid}`)"
            >
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ formatTestDateTime(r.takenAt) }}</td>
              <td class="py-2.5 pr-3 font-semibold">{{ userOf(r).name || '—' }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ userOf(r).email }}</td>
              <td class="py-2.5 pr-3">{{ userOf(r).teamName || '—' }}</td>
              <td class="py-2.5 pr-3">{{ r.sealName }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums"><strong>{{ r.total }}</strong>／{{ TEST_MAX_SCORE }}</td>
              <td class="py-2.5 text-right tabular-nums text-slate-500 dark:text-slate-400">{{ r.neutralCount }}（{{ r.penalty }}点）</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ページ送りは PC だけ。スマホは上のカード一覧が無限スクロールで継ぎ足す -->
      <div class="mt-4 hidden items-center justify-between text-sm lg:flex">
        <button class="rounded-lg border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40 dark:border-slate-700" :disabled="currentPage === 0 || loading" @click="prevPage">前へ</button>
        <span class="text-slate-500 dark:text-slate-400">ページ {{ currentPage + 1 }}</span>
        <button class="rounded-lg border border-slate-200 px-4 py-2 font-semibold disabled:opacity-40 dark:border-slate-700" :disabled="!pageHasNext[currentPage] || loading" @click="nextPage">次へ</button>
      </div>
    </div>
  </div>
</template>
