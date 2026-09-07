<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { SEALS } from '~/utils/mayaData'
import { genderLabel, isGender } from '~/utils/gender'

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
  entitlement?: 'none' | 'code'
  entitlementSource?: 'code' | 'admin' | null
  plan?: string
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
  teamName: string
  source: string
  entitled: boolean
  joined: string
  joinedAt: number
}

const rows = ref<UserRow[]>([])
const loading = ref(true)
const loadError = ref('')
const keyword = ref('')
const entitlementFilter = ref<'all' | 'entitled' | 'locked'>('all')

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
    teamName: data.teamId ? (data.teamName || data.teamId) : '',
    source: data.entitlementSource === 'admin' ? '管理者追加' : data.entitlementSource === 'code' ? 'コード入力' : '—',
    entitled: data.entitlement === 'code',
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
    if (entitlementFilter.value === 'entitled' && !r.entitled) return false
    if (entitlementFilter.value === 'locked' && r.entitled) return false
    if (!kw) return true
    return r.name.toLowerCase().includes(kw) || r.email.toLowerCase().includes(kw) || r.teamName.toLowerCase().includes(kw)
  })
})

const selected = ref<UserRow | null>(null)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">ユーザー管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        登録会員の一覧です。閲覧権限の付与・除外は<NuxtLink to="/admin/teams" class="font-semibold text-brass-700 hover:underline dark:text-gold-300">チーム管理</NuxtLink>から行います。
      </span>
    </div>

    <div class="mb-4 flex flex-wrap gap-2.5">
      <input
        v-model="keyword"
        type="text"
        placeholder="氏名・メールアドレス・チーム名で検索"
        class="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
      />
      <select v-model="entitlementFilter" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option value="all">すべての会員</option>
        <option value="entitled">閲覧できる会員</option>
        <option value="locked">閲覧できない会員</option>
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
      <div v-else class="max-h-[70vh] overflow-auto">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">名前</th>
              <th class="pb-2.5 pr-3">メール</th>
              <th class="pb-2.5 pr-3">所属チーム</th>
              <th class="pb-2.5 pr-3">所属経路</th>
              <th class="pb-2.5 pr-3">登録日</th>
              <th class="pb-2.5 pr-3">有料エリア</th>
              <th class="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in filtered" :key="u.uid" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3">{{ u.name || '—' }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.email }}</td>
              <td class="py-2.5 pr-3">{{ u.teamName || '—' }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.source }}</td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.joined }}</td>
              <td class="py-2.5 pr-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                  :class="u.entitled ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
                >{{ u.entitled ? '閲覧可' : 'ロック' }}</span>
              </td>
              <td class="py-2.5">
                <button class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="selected = u">詳細</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selected" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="selected = null">
      <div class="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold">{{ selected.name || '（氏名未登録）' }}</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ selected.email }}</span>
          </div>
          <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="閉じる" @click="selected = null">✕</button>
        </div>

        <dl class="mb-5 grid grid-cols-2 gap-y-3 text-[13px]">
          <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold">{{ selected.birthdate || '—' }}</dd></div>
          <div><dt class="text-slate-400">性別</dt><dd class="font-semibold">{{ selected.gender }}</dd></div>
          <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">{{ selected.kin ? `KIN ${selected.kin}` : '—' }}</dd></div>
          <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ selected.seal }}</dd></div>
          <div><dt class="text-slate-400">電話番号</dt><dd class="font-semibold">{{ selected.phone || '—' }}</dd></div>
          <div><dt class="text-slate-400">登録日</dt><dd class="font-semibold tabular-nums">{{ selected.joined }}</dd></div>
          <div><dt class="text-slate-400">所属チーム</dt><dd class="font-semibold">{{ selected.teamName || '—' }}</dd></div>
          <div><dt class="text-slate-400">所属経路</dt><dd class="font-semibold">{{ selected.source }}</dd></div>
        </dl>

        <p class="rounded-lg border border-slate-200 p-3.5 text-[12px] leading-[1.8] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          有料エリアの閲覧可否はチームへの所属で決まります。付与・除外は
          <NuxtLink to="/admin/teams" class="font-semibold text-brass-700 hover:underline dark:text-gold-300">チーム管理</NuxtLink>
          から行ってください。
        </p>

        <div class="mt-5 flex justify-end">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="selected = null">閉じる</button>
        </div>
      </div>
    </div>
  </div>
</template>
