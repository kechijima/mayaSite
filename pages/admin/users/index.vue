<script setup lang="ts">
import { collection, getDocs, type Firestore } from 'firebase/firestore'
import {
  USER_STATUS_LABEL,
  buildUserRow,
  userStatusChipClass,
  type UserDoc,
  type UserRow,
  type UserStatus
} from '~/utils/userAdmin'

definePageMeta({ layout: 'admin' })

// 2026-09-07: ハードコードのモックから、Firestoreのusersコレクションを読む実データへ移行。
// モックにあった「最終ログイン」「支払い方法」「ステータス(有効/解約済)」の3列は削除した:
//   最終ログイン … Firebase Authの他ユーザーの最終ログイン日時はAdmin SDK専用で、
//                  サーバーが無いこの構成ではクライアントから取得できない
//   支払い方法   … 決済が未実装で対応するデータが存在しない
//   ステータス   … 「解約」に相当する概念がまだ無い
// 閲覧権限の変更(チームへの追加・除外)は /admin/teams/[teamId] 側で行う。ここは一覧・確認用。
// 2026-09-23: 詳細(ステータス変更)はモーダルから /admin/users/[uid] のページへ移した。
// このファイルが users.vue ではなく users/index.vue なのは、users.vue だと /admin/users/[uid] の
// 親ルートになって詳細の代わりに一覧が描画されてしまうため(pages/signup と同じ理由)。

const rows = ref<UserRow[]>([])
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const statusFilter = ref<'all' | UserStatus>('all')
const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'すべて' },
  ...(Object.keys(USER_STATUS_LABEL) as UserStatus[]).map((s) => ({ value: s, label: USER_STATUS_LABEL[s] }))
]

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDocs(collection($firestore as Firestore, 'users'))
    rows.value = snap.docs
      .map((d) => buildUserRow(d.id, d.data() as UserDoc))
      .sort((a, b) => b.joinedAt - a.joinedAt)
  } catch {
    loadError.value = 'ユーザーの読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
})

// Firestoreは部分一致検索ができないため、取得済みデータに対するクライアント側の絞り込み。
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (!kw) return true
    return r.name.toLowerCase().includes(kw) || r.email.toLowerCase().includes(kw) || r.teamName.toLowerCase().includes(kw)
  })
})
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">ユーザー管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        登録会員の一覧です。会員ステータス（有料エリアの閲覧可否）は各会員の詳細から変更できます。
      </span>
    </div>

    <AdminSearchBar
      v-model="keyword"
      placeholder="氏名・メールアドレス・チーム名で検索"
      :active-filters="statusFilter === 'all' ? 0 : 1"
      @reset="statusFilter = 'all'"
    >
      <AdminFilterChips v-model="statusFilter" label="会員ステータス" :options="STATUS_FILTER_OPTIONS" />
    </AdminSearchBar>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p v-if="loading" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>
      <p v-else-if="!filtered.length" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {{ rows.length ? '条件に一致する会員はいません。' : 'まだ登録会員がいません。' }}
      </p>
      <template v-else>
        <!-- lg 未満はテーブルの代わりにカード一覧。タップで詳細ページへ(AdminRecordCard 参照) -->
        <ul class="lg:hidden">
          <AdminRecordCard
            v-for="u in filtered"
            :key="u.uid"
            :title="u.name || '—'"
            :subtitle="u.email"
            :fields="[
              { label: '所属チーム', value: u.teamName || '—' },
              { label: '所属経路', value: u.source },
              { label: '登録日', value: u.joined }
            ]"
            :to="`/admin/users/${u.uid}`"
          >
            <template #badge>
              <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="userStatusChipClass(u.status)">{{ USER_STATUS_LABEL[u.status] }}</span>
            </template>
          </AdminRecordCard>
        </ul>
        <div class="hidden max-h-[70vh] overflow-auto lg:block">
          <table class="w-full text-[13px]">
            <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
              <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th class="pb-2.5 pr-3">名前</th>
                <th class="pb-2.5 pr-3">メール</th>
                <th class="pb-2.5 pr-3">ステータス</th>
                <th class="pb-2.5 pr-3">所属チーム</th>
                <th class="pb-2.5 pr-3">所属経路</th>
                <th class="pb-2.5 pr-3">登録日</th>
                <th class="pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in filtered" :key="u.uid" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td class="py-2.5 pr-3">{{ u.name || '—' }}</td>
                <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.email }}</td>
                <td class="py-2.5 pr-3">
                  <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="userStatusChipClass(u.status)">{{ USER_STATUS_LABEL[u.status] }}</span>
                </td>
                <td class="py-2.5 pr-3">{{ u.teamName || '—' }}</td>
                <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.source }}</td>
                <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.joined }}</td>
                <td class="py-2.5">
                  <NuxtLink :to="`/admin/users/${u.uid}`" class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">詳細</NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
