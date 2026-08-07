<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface UserRow {
  name: string
  email: string
  plan: string
  joined: string
  lastLogin: string
  status: string
  birthdate: string
  kin: number
  seal: string
  paymentMethod: string
}

const plans = ['無料', '有料']
const statuses = ['有効', '解約済']

const users = ref<UserRow[]>([
  { name: '高橋 直子', email: 'naoko.t@example.com', plan: '有料', joined: '2026-07-13', lastLogin: '2026-07-14 08:12', status: '有効', birthdate: '1988-03-02', kin: 214, seal: '青い夜', paymentMethod: 'Visa •••• 4242' },
  { name: '渡辺 蓮', email: 'ren.w@example.com', plan: '無料', joined: '2026-07-13', lastLogin: '2026-07-13 21:40', status: '有効', birthdate: '1995-11-20', kin: 87, seal: '白い犬', paymentMethod: '—' },
  { name: '中村 美咲', email: 'misaki.n@example.com', plan: '有料', joined: '2026-07-12', lastLogin: '2026-07-14 07:02', status: '有効', birthdate: '1990-06-08', kin: 156, seal: '黄色い星', paymentMethod: 'Mastercard •••• 9981' },
  { name: '小林 健太', email: 'kenta.k@example.com', plan: '無料', joined: '2026-07-12', lastLogin: '2026-07-12 12:55', status: '有効', birthdate: '2000-01-30', kin: 42, seal: '赤い蛇', paymentMethod: '—' },
  { name: '山本 さくら', email: 'sakura.y@example.com', plan: '有料', joined: '2026-07-11', lastLogin: '2026-07-11 19:23', status: '解約済', birthdate: '1993-09-14', kin: 199, seal: '青い鷲', paymentMethod: 'Visa •••• 0071' }
])

const selectedUser = ref<UserRow | null>(null)
const draftPlan = ref('')
const draftStatus = ref('')

function openDetail(user: UserRow) {
  selectedUser.value = user
  draftPlan.value = user.plan
  draftStatus.value = user.status
}

function closeDetail() {
  selectedUser.value = null
}

function applyChanges() {
  if (!selectedUser.value) return
  selectedUser.value.plan = draftPlan.value
  selectedUser.value.status = draftStatus.value
  closeDetail()
}

function planChip(plan: string) {
  return plan === '無料'
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
}
function statusChip(status: string) {
  return status === '有効'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
    : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">ユーザー管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">会員ステータスの確認・手動変更ができます</span>
    </div>

    <div class="mb-4 flex flex-wrap gap-2.5">
      <input type="text" placeholder="名前・メールアドレスで検索" class="min-w-[200px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべてのプラン</option><option v-for="p in plans" :key="p">{{ p }}</option>
      </select>
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべてのステータス</option><option v-for="s in statuses" :key="s">{{ s }}</option>
      </select>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">名前</th><th class="pb-2.5 pr-3">メール</th><th class="pb-2.5 pr-3">プラン</th><th class="pb-2.5 pr-3">登録日</th><th class="pb-2.5 pr-3">最終ログイン</th><th class="pb-2.5 pr-3">ステータス</th><th class="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.email" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3">{{ u.name }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.email }}</td>
              <td class="py-2.5 pr-3"><span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="planChip(u.plan)">{{ u.plan }}</span></td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.joined }}</td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.lastLogin }}</td>
              <td class="py-2.5 pr-3"><span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(u.status)">{{ u.status }}</span></td>
              <td class="py-2.5"><button class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="openDetail(u)">詳細</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail / manual override modal -->
    <div v-if="selectedUser" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="closeDetail">
      <div class="w-full max-w-[480px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-5 flex items-start justify-between">
          <div>
            <h2 class="text-base font-bold">{{ selectedUser.name }}</h2>
            <span class="text-xs text-slate-500 dark:text-slate-400">{{ selectedUser.email }}</span>
          </div>
          <button class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="閉じる" @click="closeDetail">✕</button>
        </div>

        <dl class="mb-5 grid grid-cols-2 gap-y-3 text-[13px]">
          <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold">{{ selectedUser.birthdate }}</dd></div>
          <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">KIN {{ selectedUser.kin }}</dd></div>
          <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ selectedUser.seal }}</dd></div>
          <div><dt class="text-slate-400">支払い方法</dt><dd class="font-semibold">{{ selectedUser.paymentMethod }}</dd></div>
          <div><dt class="text-slate-400">登録日</dt><dd class="font-semibold tabular-nums">{{ selectedUser.joined }}</dd></div>
          <div><dt class="text-slate-400">最終ログイン</dt><dd class="font-semibold tabular-nums">{{ selectedUser.lastLogin }}</dd></div>
        </dl>

        <div class="mb-5 space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p class="text-xs font-bold text-slate-500 dark:text-slate-400">会員ステータス手動変更（カスタマーサポート用）</p>
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">プラン</label>
              <select v-model="draftPlan" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option v-for="p in plans" :key="p">{{ p }}</option>
              </select>
            </div>
            <div class="flex-1">
              <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">ステータス</label>
              <select v-model="draftStatus" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
                <option v-for="s in statuses" :key="s">{{ s }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="closeDetail">閉じる</button>
          <button class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white" @click="applyChanges">変更を適用</button>
        </div>
      </div>
    </div>
  </div>
</template>
