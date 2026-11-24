<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  countMembers,
  createTeam,
  fetchCodeStatus,
  fetchTeams,
  referralSignupUrl,
  type ReferralTeam
} from '~/utils/referralTeamAdmin'

definePageMeta({ layout: 'admin' })

interface TeamRow extends ReferralTeam {
  status: 'active' | 'disabled' | 'missing'
  members: number
}

const { withLoading } = useGlobalLoading()
// window.location を使うので、マウント後に組み立てる
const signupUrl = ref('/signup/referral')
onMounted(() => (signupUrl.value = referralSignupUrl()))

const rows = ref<TeamRow[]>([])
const loading = ref(true)
useLoadingWhile('admin-teams', () => loading.value)
const loadError = ref('')

const creating = ref(false)
const createError = ref('')
const newTeamName = ref('')
// 作成直後のコードを一度だけ大きく出す。配布のたびに詳細画面へ入らずに済むように。
const justCreated = ref<{ name: string; code: string } | null>(null)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const { $firestore } = useNuxtApp()
    const firestore = $firestore as Firestore
    const teams = await fetchTeams(firestore)
    // 状態とメンバー数はチームごとに別ドキュメント/集計クエリなので並列で取る。
    rows.value = await Promise.all(
      teams.map(async (team) => {
        const [code, members] = await Promise.all([
          fetchCodeStatus(firestore, team.code),
          countMembers(firestore, team.id)
        ])
        return { ...team, status: code?.status ?? 'missing', members }
      })
    )
  } catch {
    loadError.value = 'チームの読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function submitCreate() {
  const name = newTeamName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  createError.value = ''
  try {
    const { $firestore } = useNuxtApp()
    // 衝突確認のための読み取りと2ドキュメントの書き込み、そのあとの一覧再取得までを覆う。
    const { code } = await withLoading(() => createTeam($firestore as Firestore, name))
    justCreated.value = { name, code }
    newTeamName.value = ''
    await withLoading(load)
  } catch (err) {
    createError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '権限がありません。再度ログインしてください。'
      : 'チームの作成に失敗しました。時間をおいて再度お試しください。'
  } finally {
    creating.value = false
  }
}

function formatDate(row: TeamRow) {
  const d = row.createdAt?.toDate()
  if (!d) return '—'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function statusChip(status: TeamRow['status']) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
  if (status === 'disabled') return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
  return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
}
function statusLabel(status: TeamRow['status']) {
  return status === 'active' ? '有効' : status === 'disabled' ? '無効' : 'コード未作成'
}
// 登録画面(/signup/referral・/account)のチーム選択での扱い(2026-11-19)。
// 「選択肢に出す」設定(listed)でも、コードが無効なら選択肢には出ない(usePublicTeams が active で絞る)。
function signupLabel(row: TeamRow) {
  if (!row.listed) return 'その他から入力'
  return row.status === 'active' ? '選択肢に表示' : '表示設定（コード無効のため非表示）'
}
function signupChip(row: TeamRow) {
  if (row.listed && row.status === 'active') return 'bg-amber-50 text-brass-700 dark:bg-amber-950/40 dark:text-gold-300'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">チーム管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        チームを作成すると紹介コードが1つ発行されます。コードを入力した会員はそのチームに所属し、所属している間はチーム会員として扱われます。「登録画面」が「選択肢に表示」のチームは、紹介コード付き会員登録ページのチーム選択に出て、選ぶとコードが自動で入ります。それ以外のチームは「その他」を選んでコードを入力すると所属できます（切り替えはチームの詳細画面）。
      </span>
    </div>

    <!-- 紹介コード付き会員登録ページのURL(2026-11-24 要望)。コードと一緒に配る用 -->
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p class="mb-2 text-sm font-bold">紹介コードで会員登録する画面のURL</p>
      <div class="flex flex-wrap items-center gap-3">
        <code class="min-w-0 max-w-full break-all rounded bg-slate-50 px-3 py-1.5 font-mono text-[12.5px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{{ signupUrl }}</code>
        <CopyIconButton :value="signupUrl" label="URLをコピー" text="URLをコピー" />
      </div>
      <p class="mt-2 text-[11.5px] text-slate-500 dark:text-slate-400">
        このURLと紹介コードを一緒に送ってください。開いた画面でチームを選び、紹介コードを入力すると、チーム会員として登録できます。
      </p>
    </div>

    <!-- 作成 -->
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p class="mb-3 text-sm font-bold">チームを作成</p>
      <form class="flex flex-wrap gap-2.5" @submit.prevent="submitCreate">
        <input
          v-model="newTeamName"
          type="text"
          placeholder="チーム名（例：Aチーム）"
          class="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:min-w-[220px] sm:flex-1 dark:border-slate-800 dark:bg-slate-900"
        />
        <button
          type="submit"
          class="w-full rounded-lg bg-brass-700 sm:w-auto px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          :disabled="creating || !newTeamName.trim()"
        >
          {{ creating ? '作成中…' : '作成する' }}
        </button>
      </form>
      <p v-if="createError" class="mt-2.5 text-xs font-semibold text-red-600 dark:text-red-400">{{ createError }}</p>

      <!-- 作成直後のコード。ここで控えて配布してもらう。 -->
      <div v-if="justCreated" class="mt-4 rounded-lg border border-brass-700/30 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
        <p class="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
          「{{ justCreated.name }}」の紹介コードを発行しました
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <code class="rounded bg-white px-3 py-1.5 font-mono text-lg font-bold tracking-[.08em] dark:bg-slate-900">{{ justCreated.code }}</code>
          <CopyIconButton :value="justCreated.code" />
        </div>
        <p class="mt-2 text-[11.5px] text-slate-500 dark:text-slate-400">
          このコードは会員には表示されません。配布は管理者が行ってください。
        </p>
      </div>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <template v-if="loading" />
      <p v-else-if="!rows.length" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        まだチームがありません。上のフォームから作成してください。
      </p>
      <template v-else>
        <!-- lg 未満はテーブルの代わりにカード一覧。タップで詳細へ(AdminRecordCard 参照) -->
        <ul class="lg:hidden">
          <AdminRecordCard
            v-for="row in rows"
            :key="row.id"
            :title="row.name"
            :subtitle="row.code"
            :fields="[
              { label: '登録画面', value: signupLabel(row) },
              { label: 'メンバー', value: `${row.members}名` },
              { label: '作成日', value: formatDate(row) }
            ]"
            :to="`/admin/teams/${row.id}`"
          >
            <template #badge>
              <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(row.status)">{{ statusLabel(row.status) }}</span>
            </template>
          </AdminRecordCard>
        </ul>
        <div class="hidden max-h-[70vh] overflow-auto lg:block">
          <table class="w-full text-[13px]">
            <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
              <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th class="pb-2.5 pr-3">チーム名</th>
                <th class="pb-2.5 pr-3">コード</th>
                <th class="pb-2.5 pr-3">状態</th>
                <th class="pb-2.5 pr-3">登録画面</th>
                <th class="pb-2.5 pr-3 text-right">メンバー</th>
                <th class="pb-2.5">作成日</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40" @click="navigateTo(`/admin/teams/${row.id}`)">
                <td class="py-2.5 pr-3 font-semibold">{{ row.name }}</td>
                <td class="py-2.5 pr-3 font-mono tracking-[.05em]">{{ row.code }}</td>
                <td class="py-2.5 pr-3">
                  <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(row.status)">{{ statusLabel(row.status) }}</span>
                </td>
                <td class="py-2.5 pr-3">
                  <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="signupChip(row)">{{ signupLabel(row) }}</span>
                </td>
                <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.members }}</td>
                <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ formatDate(row) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </div>
</template>
