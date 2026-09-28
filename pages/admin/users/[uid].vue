<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  SELECTABLE_USER_STATUSES,
  USER_STATUS_LABEL,
  USER_STATUS_NOTE,
  fetchUserRow,
  setUserStatus,
  userStatus,
  userStatusChipClass,
  type UserRow,
  type UserStatus
} from '~/utils/userAdmin'
import { TEST_LEVELS, TEST_LEVEL_LABEL, TEST_LEVEL_TITLE } from '~/utils/achievementTest'
import { fetchTestResults, formatTestDateTime, summarizeByLevel, type TestResultRow } from '~/utils/achievementTestResults'

definePageMeta({ layout: 'admin' })

// 会員の詳細と会員ステータスの変更。2026-09-23 に /admin/users のモーダルからページへ移した
// (他の詳細がページなのにここだけモーダルで、スマホで扱いづらかったため)。
// チームの出し入れは「誰の紹介で入会したか」の付け替えなのでチーム管理側(/admin/teams)。

const route = useRoute()
const uid = route.params.uid as string

const user = ref<UserRow | null>(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

const draftStatus = ref<UserStatus>('free')
const savingStatus = ref(false)
const statusError = ref('')
const statusSaved = ref(false)

const { withLoading } = useGlobalLoading()

// 到達度テストの受験履歴(新しい順)。チーム会員しか受けられないが、チームを外れた後も
// 過去の記録は残るので、所属の有無に関わらず出す(無ければ「まだ受けていません」)。
const testResults = ref<TestResultRow[]>([])
const testSummary = computed(() => summarizeByLevel(testResults.value))
const testLoadError = ref('')

function firestore() {
  const { $firestore } = useNuxtApp()
  return $firestore as Firestore
}

onMounted(async () => {
  try {
    const [row, results] = await Promise.all([
      fetchUserRow(firestore(), uid),
      fetchTestResults(firestore(), uid).catch(() => {
        testLoadError.value = '受験履歴を読み込めませんでした。'
        return [] as TestResultRow[]
      })
    ])
    if (!row) {
      notFound.value = true
      return
    }
    user.value = row
    draftStatus.value = row.status
    testResults.value = results
  } catch {
    loadError.value = '会員情報の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
})

// 有料会員は決済導入後に解禁するが、既に 'paid' の会員を開いたときは
// その選択肢も出す(出さないと現在の状態を表せなくなるため)。
// チーム所属中の会員は「利用停止でない」状態がチーム会員になるので、
// 無料会員の代わりにそれを出す — 無料会員を選べても所属がある限り紹介のままになるため。
const statusOptions = computed<UserStatus[]>(() => {
  const base = SELECTABLE_USER_STATUSES.map((s) => (s === 'free' && user.value?.teamId ? 'team' : s))
  if (user.value && !base.includes(user.value.status)) base.unshift(user.value.status)
  return base
})

async function applyStatus() {
  if (!user.value || savingStatus.value || draftStatus.value === user.value.status) return
  savingStatus.value = true
  statusError.value = ''
  statusSaved.value = false
  try {
    await withLoading(() => setUserStatus(firestore(), uid, draftStatus.value))
    // ステータスは導出値なので、書き込んだ plan/suspended と所属から導き直す。
    const next = userStatus({
      plan: draftStatus.value === 'paid' ? 'paid' : 'free',
      suspended: draftStatus.value === 'suspended',
      teamId: user.value.teamId
    })
    user.value.status = next
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
</script>

<template>
  <div>
    <NuxtLink to="/admin/users" class="mb-4 inline-block text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">‹ ユーザー管理に戻る</NuxtLink>

    <div v-if="notFound" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      指定された会員が見つかりませんでした。
    </div>
    <div v-else-if="loadError" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <p v-else-if="loading" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>

    <template v-else-if="user">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div class="min-w-0">
          <h1 class="text-xl font-bold">{{ user.name || '（氏名未登録）' }}</h1>
          <span class="break-all text-xs text-slate-500 dark:text-slate-400">{{ user.email }}</span>
        </div>
        <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="userStatusChipClass(user.status)">{{ USER_STATUS_LABEL[user.status] }}</span>
      </div>

      <!-- 基本情報 -->
      <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-3 text-sm font-bold">基本情報</p>
        <dl class="grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
          <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold">{{ user.birthdate || '—' }}</dd></div>
          <div><dt class="text-slate-400">性別</dt><dd class="font-semibold">{{ user.gender }}</dd></div>
          <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">{{ user.kin ? `KIN ${user.kin}` : '—' }}</dd></div>
          <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ user.seal }}</dd></div>
          <div><dt class="text-slate-400">電話番号</dt><dd class="font-semibold">{{ user.phone || '—' }}</dd></div>
          <div><dt class="text-slate-400">登録日</dt><dd class="font-semibold tabular-nums">{{ user.joined }}</dd></div>
          <div><dt class="text-slate-400">所属チーム</dt><dd class="font-semibold">{{ user.teamName || '—' }}</dd></div>
          <div><dt class="text-slate-400">所属経路</dt><dd class="font-semibold">{{ user.source }}</dd></div>
        </dl>
      </div>

      <!-- 会員ステータス。有料エリアの閲覧可否はここで決まる。 -->
      <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-3 text-sm font-bold">会員ステータス</p>
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
            :disabled="savingStatus || draftStatus === user.status"
            @click="applyStatus"
          >
            {{ savingStatus ? '変更中…' : '変更を適用' }}
          </button>
          <span v-if="statusSaved" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">変更しました</span>
          <span v-if="statusError" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ statusError }}</span>
        </div>
      </div>

      <!-- 到達度テスト。級ごとのまとめと、1回ごとの答案(開くと10問の正誤が見える)。 -->
      <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-3 text-sm font-bold">到達度テスト</p>
        <dl class="mb-4 grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-3">
          <div v-for="level in TEST_LEVELS" :key="level">
            <dt class="text-slate-400">{{ TEST_LEVEL_LABEL[level] }}（{{ TEST_LEVEL_TITLE[level] }}）</dt>
            <dd class="font-semibold tabular-nums">
              <template v-if="testSummary[level].attempts === 0">未受験</template>
              <template v-else>
                <span :class="testSummary[level].passed ? 'text-emerald-600 dark:text-emerald-400' : ''">{{ testSummary[level].passed ? '合格' : '未合格' }}</span>
                <span class="ml-1.5 font-normal text-slate-500 dark:text-slate-400">最高 {{ testSummary[level].best }}／{{ testSummary[level].total }}・{{ testSummary[level].attempts }}回</span>
              </template>
            </dd>
          </div>
        </dl>
        <p v-if="testLoadError" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ testLoadError }}</p>
        <p v-else-if="!testResults.length" class="text-[12px] text-slate-500 dark:text-slate-400">まだ受けていません。</p>
        <ul v-else class="divide-y divide-slate-100 dark:divide-slate-800/60">
          <li v-for="r in testResults" :key="r.id">
            <details class="group py-2.5">
              <summary class="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 text-[13px] [&::-webkit-details-marker]:hidden">
                <span class="tabular-nums text-slate-500 dark:text-slate-400">{{ formatTestDateTime(r.takenAt) }}</span>
                <span class="font-semibold">{{ TEST_LEVEL_LABEL[r.level] }}</span>
                <span class="tabular-nums">{{ r.score }}／{{ r.total }}点</span>
                <span
                  class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                  :class="r.passed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'"
                >{{ r.passed ? '合格' : '未合格' }}</span>
                <span class="ml-auto text-[11px] text-slate-400 group-open:hidden">答案を見る</span>
                <span class="ml-auto hidden text-[11px] text-slate-400 group-open:inline">閉じる</span>
              </summary>
              <ol class="mt-2 space-y-2 rounded-lg bg-slate-50 p-3 text-[12.5px] dark:bg-slate-800/60">
                <li v-for="(a, i) in r.answers" :key="i" class="flex gap-2">
                  <span class="flex-none font-bold" :class="a.selectedIndex === a.answerIndex ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                    {{ a.selectedIndex === a.answerIndex ? '○' : '×' }}
                  </span>
                  <span class="min-w-0">
                    <span class="whitespace-pre-line">{{ a.prompt }}</span>
                    <span class="mt-0.5 flex flex-wrap gap-x-3 text-[11.5px] text-slate-500 dark:text-slate-400">
                      <span>回答: {{ a.choices[a.selectedIndex] }}</span>
                      <span v-if="a.selectedIndex !== a.answerIndex">正解: {{ a.choices[a.answerIndex] }}</span>
                    </span>
                  </span>
                </li>
              </ol>
            </details>
          </li>
        </ul>
      </div>

      <p class="rounded-lg border border-slate-200 p-3.5 text-[12px] leading-[1.8] text-slate-500 dark:border-slate-800 dark:text-slate-400">
        所属チームの変更は
        <NuxtLink to="/admin/teams" class="font-semibold text-brass-700 hover:underline dark:text-gold-300">チーム管理</NuxtLink>
        から行います。チームに所属している間はチーム会員として扱われ、チームから外すと無料会員に戻ります。
      </p>
    </template>
  </div>
</template>
