<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  countMembers,
  createTeam,
  fetchCodeStatus,
  fetchTeams,
  type ReferralTeam
} from '~/utils/referralTeamAdmin'

definePageMeta({ layout: 'admin' })

interface TeamRow extends ReferralTeam {
  status: 'active' | 'disabled' | 'missing'
  members: number
}

const { withLoading } = useGlobalLoading()

const rows = ref<TeamRow[]>([])
const loading = ref(true)
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
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">チーム管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        チームを作成すると紹介コードが1つ発行されます。コードを入力した会員はそのチームに所属し、有料エリアを閲覧できます。
      </span>
    </div>

    <!-- 作成 -->
    <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p class="mb-3 text-sm font-bold">チームを作成</p>
      <form class="flex flex-wrap gap-2.5" @submit.prevent="submitCreate">
        <input
          v-model="newTeamName"
          type="text"
          placeholder="チーム名（例：Aチーム）"
          class="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
        />
        <button
          type="submit"
          class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
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
      <p v-if="loading" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>
      <p v-else-if="!rows.length" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        まだチームがありません。上のフォームから作成してください。
      </p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">チーム名</th>
              <th class="pb-2.5 pr-3">コード</th>
              <th class="pb-2.5 pr-3">状態</th>
              <th class="pb-2.5 pr-3 text-right">メンバー</th>
              <th class="pb-2.5 pr-3">作成日</th>
              <th class="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3 font-semibold">{{ row.name }}</td>
              <td class="py-2.5 pr-3 font-mono tracking-[.05em]">{{ row.code }}</td>
              <td class="py-2.5 pr-3">
                <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(row.status)">{{ statusLabel(row.status) }}</span>
              </td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ row.members }}</td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ formatDate(row) }}</td>
              <td class="py-2.5">
                <NuxtLink :to="`/admin/teams/${row.id}`" class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">詳細</NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
