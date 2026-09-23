<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { SEALS } from '~/utils/mayaData'
import { genderLabel, isGender } from '~/utils/gender'
import {
  SELECTABLE_USER_STATUSES,
  USER_STATUS_LABEL,
  USER_STATUS_NOTE,
  setUserStatus,
  userStatus,
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

interface UserDoc {
  name?: string
  email?: string
  phone?: string
  birthdate?: string
  gender?: string
  teamId?: string | null
  teamName?: string | null
  entitlementSource?: 'code' | 'admin' | null
  plan?: string
  suspended?: boolean
  createdAt?: Timestamp
}

interface UserRow {
  uid: string
  name: string
  email: string
  phone: string
  birthdate: string
  gender: string
  kin: number | null
  seal: string
  teamId: string | null
  teamName: string
  source: string
  status: UserStatus
  joined: string
  joinedAt: number
}

const rows = ref<UserRow[]>([])
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const statusFilter = ref<'all' | UserStatus>('all')

function formatDate(ts?: Timestamp) {
  const d = ts?.toDate()
  if (!d) return '—'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildRow(uid: string, data: UserDoc): UserRow {
  // KIN・太陽の紋章は保存せず生年月日から都度算出する(診断本体と同じ計算式を使うため、
  // 保存しておくと計算式を直した時に古い値が残ってしまう)。
  let kin: number | null = null
  let seal = '—'
  if (data.birthdate) {
    try {
      const { birth } = diagnoseBirthdate(data.birthdate)
      kin = birth.kin
      seal = SEALS[birth.sealIndex]?.name ?? '—'
    } catch {
      kin = null
    }
  }
  return {
    uid,
    name: data.name ?? '',
    email: data.email ?? '',
    phone: data.phone ?? '',
    birthdate: data.birthdate ?? '',
    gender: data.gender && isGender(data.gender) ? genderLabel(data.gender) : '—',
    kin,
    seal,
    teamId: data.teamId ?? null,
    teamName: data.teamId ? (data.teamName || data.teamId) : '',
    source: data.entitlementSource === 'admin' ? '管理者追加' : data.entitlementSource === 'code' ? 'コード入力' : '—',
    status: userStatus(data),
    joined: formatDate(data.createdAt),
    joinedAt: data.createdAt?.toMillis() ?? 0
  }
}

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDocs(collection($firestore as Firestore, 'users'))
    rows.value = snap.docs
      .map((d) => buildRow(d.id, d.data() as UserDoc))
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

const selected = ref<UserRow | null>(null)
const draftStatus = ref<UserStatus>('free')
const savingStatus = ref(false)
const statusError = ref('')
const statusSaved = ref(false)

function openDetail(row: UserRow) {
  selected.value = row
  draftStatus.value = row.status
  statusError.value = ''
  statusSaved.value = false
}

// 有料会員は決済導入後に解禁するが、既に 'paid' の会員を開いたときは
// その選択肢も出す(出さないと現在の状態を表せなくなるため)。
// チーム所属中の会員は「利用停止でない」状態がチーム会員になるので、
// 無料会員の代わりにそれを出す — 無料会員を選べても所属がある限り紹介のままになるため。
const statusOptions = computed<UserStatus[]>(() => {
  const base = SELECTABLE_USER_STATUSES.map((s) => (s === 'free' && selected.value?.teamId ? 'team' : s))
  if (selected.value && !base.includes(selected.value.status)) base.unshift(selected.value.status)
  return base
})

async function applyStatus() {
  if (!selected.value || savingStatus.value || draftStatus.value === selected.value.status) return
  savingStatus.value = true
  statusError.value = ''
  statusSaved.value = false
  try {
    const { $firestore } = useNuxtApp()
    await withLoading(() => setUserStatus($firestore as Firestore, selected.value!.uid, draftStatus.value))
    // 一覧側にも反映させる。再取得は行数が多いと重いので、対象の行だけ書き換える。
    // ステータスは導出値なので、書き込んだ plan/suspended と所属から導き直す。
    const next = userStatus({
      plan: draftStatus.value === 'paid' ? 'paid' : 'free',
      suspended: draftStatus.value === 'suspended',
      teamId: selected.value.teamId
    })
    const row = rows.value.find((r) => r.uid === selected.value!.uid)
    if (row) row.status = next
    selected.value.status = next
    draftStatus.value = next
    statusSaved.value = true
  } catch (err) {
    statusError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '権限がありません。再度ログインしてください。'
      : '変更に失敗しました。時間をおいて再度お試しください。'
  } finally {
    savingStatus.value = false
  }
}

function statusChip(status: UserStatus) {
  if (status === 'suspended') return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
  if (status === 'paid') return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
  if (status === 'team') return 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-400'
  return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
}

const { withLoading } = useGlobalLoading()
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">ユーザー管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        登録会員の一覧です。会員ステータス（有料エリアの閲覧可否）は各会員の詳細から変更できます。
      </span>
    </div>

    <div class="mb-4 flex flex-wrap gap-2.5">
      <input
        v-model="keyword"
        type="text"
        placeholder="氏名・メールアドレス・チーム名で検索"
        class="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:min-w-[240px] sm:flex-1 dark:border-slate-800 dark:bg-slate-900"
      />
      <select v-model="statusFilter" class="w-full rounded-lg sm:w-auto border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option value="all">すべてのステータス</option>
        <option value="free">無料会員</option>
        <option value="team">チーム会員</option>
        <option value="paid">有料会員</option>
        <option value="suspended">利用停止</option>
      </select>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <p v-if="loading" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>
      <p v-else-if="!filtered.length" class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        {{ rows.length ? '条件に一致する会員はいません。' : 'まだ登録会員がいません。' }}
      </p>
      <template v-else>
        <!-- lg 未満はテーブルの代わりにカード一覧。タップで詳細モーダル(AdminRecordCard 参照) -->
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
            clickable
            @click="openDetail(u)"
          >
            <template #badge>
              <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(u.status)">{{ USER_STATUS_LABEL[u.status] }}</span>
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
                  <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(u.status)">{{ USER_STATUS_LABEL[u.status] }}</span>
                </td>
                <td class="py-2.5 pr-3">{{ u.teamName || '—' }}</td>
                <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.source }}</td>
                <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.joined }}</td>
                <td class="py-2.5">
                  <button class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="openDetail(u)">詳細</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- max-h + overflow-y-auto はスマホ用。内容が画面より高いと、items-center の中央寄せで上下が
         画面外に出て届かなくなるため(history の詳細モーダルと同じ扱い)。 -->
    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="selected = null">
      <div class="max-h-[calc(100vh-2rem)] w-full max-w-[480px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold">{{ selected.name || '（氏名未登録）' }}</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ selected.email }}</span>
          </div>
          <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="閉じる" @click="selected = null">✕</button>
        </div>

        <dl class="mb-5 grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-2">
          <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold">{{ selected.birthdate || '—' }}</dd></div>
          <div><dt class="text-slate-400">性別</dt><dd class="font-semibold">{{ selected.gender }}</dd></div>
          <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">{{ selected.kin ? `KIN ${selected.kin}` : '—' }}</dd></div>
          <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ selected.seal }}</dd></div>
          <div><dt class="text-slate-400">電話番号</dt><dd class="font-semibold">{{ selected.phone || '—' }}</dd></div>
          <div><dt class="text-slate-400">登録日</dt><dd class="font-semibold tabular-nums">{{ selected.joined }}</dd></div>
          <div><dt class="text-slate-400">所属チーム</dt><dd class="font-semibold">{{ selected.teamName || '—' }}</dd></div>
          <div><dt class="text-slate-400">所属経路</dt><dd class="font-semibold">{{ selected.source }}</dd></div>
        </dl>

        <!-- 会員ステータス。有料エリアの閲覧可否はここで決まる。
             チームの出し入れは「誰の紹介で入会したか」の付け替えなのでチーム管理側。 -->
        <div class="mb-5 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p class="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">会員ステータス</p>
          <div class="mb-2.5 flex flex-wrap gap-2">
            <label
              v-for="opt in statusOptions"
              :key="opt"
              class="cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold"
              :class="draftStatus === opt
                ? 'border-brass-700 bg-amber-50 text-brass-700 dark:border-gold-300 dark:bg-amber-950/40 dark:text-gold-300'
                : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'"
            >
              <input v-model="draftStatus" type="radio" :value="opt" class="sr-only" />
              {{ USER_STATUS_LABEL[opt] }}
            </label>
          </div>
          <p class="mb-3 text-[12px] leading-[1.8] text-slate-500 dark:text-slate-400">{{ USER_STATUS_NOTE[draftStatus] }}</p>
          <p v-if="!statusOptions.includes('paid')" class="mb-3 text-[11.5px] text-slate-400">
            有料会員は決済機能の導入後に選択できるようになります。
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="savingStatus || draftStatus === selected.status"
              @click="applyStatus"
            >
              {{ savingStatus ? '変更中…' : '変更を適用' }}
            </button>
            <span v-if="statusSaved" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">変更しました</span>
            <span v-if="statusError" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ statusError }}</span>
          </div>
        </div>

        <p class="rounded-lg border border-slate-200 p-3.5 text-[12px] leading-[1.8] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          所属チームの変更は
          <NuxtLink to="/admin/teams" class="font-semibold text-brass-700 hover:underline dark:text-gold-300">チーム管理</NuxtLink>
          から行います。チームに所属している間はチーム会員として扱われ、チームから外すと無料会員に戻ります。
        </p>

        <div class="mt-5 flex justify-end">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="selected = null">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>
