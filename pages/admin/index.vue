<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const stats = [
  { label: '総ユーザー数', value: '4,812', delta: '+128（今週）', up: true },
  { label: '有料会員数', value: '963', delta: '転換率 20.0%', up: true },
  { label: '今月の売上', value: '¥1,284,600', delta: '+8.4%（前月比）', up: true },
  { label: '診断実施数（今月）', value: '6,204', delta: '-3.1%（前月比）', up: false }
]

const monthly = [
  { label: '2月', val: '¥98万', h: 62 },
  { label: '3月', val: '¥104万', h: 68 },
  { label: '4月', val: '¥112万', h: 74 },
  { label: '5月', val: '¥109万', h: 71 },
  { label: '6月', val: '¥118万', h: 78 },
  { label: '7月', val: '¥128万', h: 100 }
]

const recentUsers = [
  { name: '高橋 直子', email: 'naoko.t@example.com', plan: '有料', date: '2026-07-13', status: '有効' },
  { name: '渡辺 蓮', email: 'ren.w@example.com', plan: '無料', date: '2026-07-13', status: '有効' },
  { name: '中村 美咲', email: 'misaki.n@example.com', plan: '有料', date: '2026-07-12', status: '有効' },
  { name: '小林 健太', email: 'kenta.k@example.com', plan: '無料', date: '2026-07-12', status: '有効' },
  { name: '山本 さくら', email: 'sakura.y@example.com', plan: '有料', date: '2026-07-11', status: '解約済' }
]

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
    <div class="mb-5.5 flex items-baseline justify-between">
      <h1 class="text-xl font-bold">ダッシュボード</h1>
      <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400">2026年7月14日（火）時点</span>
    </div>

    <div class="mb-5.5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div v-for="s in stats" :key="s.label" class="rounded-xl border border-slate-200 bg-white px-4.5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-2 text-xs text-slate-500 dark:text-slate-400">{{ s.label }}</div>
        <div class="text-2xl font-bold tracking-tight tabular-nums">{{ s.value }}</div>
        <span class="mt-1.5 inline-block text-xs font-semibold" :class="s.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
          {{ s.up ? '▲' : '▼' }} {{ s.delta }}
        </span>
      </div>
    </div>

    <div class="mb-5 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="mb-4 text-sm font-bold">月次売上推移</h2>
      <div class="flex h-[150px] items-end gap-4.5 pt-2.5">
        <div v-for="m in monthly" :key="m.label" class="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span class="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{{ m.val }}</span>
          <div class="w-full max-w-[38px] rounded-t-md bg-gradient-to-b from-brass-700 to-brass-700/60" :style="{ height: m.h + '%' }"></div>
          <span class="text-[11.5px] text-slate-600 dark:text-slate-300">{{ m.label }}</span>
        </div>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <h2 class="mb-4 text-sm font-bold">最近登録したユーザー</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">名前</th><th class="pb-2.5 pr-3">メール</th><th class="pb-2.5 pr-3">プラン</th><th class="pb-2.5 pr-3">登録日</th><th class="pb-2.5">ステータス</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in recentUsers" :key="u.email" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td class="py-2.5 pr-3">{{ u.name }}</td>
              <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ u.email }}</td>
              <td class="py-2.5 pr-3"><span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="planChip(u.plan)">{{ u.plan }}</span></td>
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ u.date }}</td>
              <td class="py-2.5"><span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="statusChip(u.status)">{{ u.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
