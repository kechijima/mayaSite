<script setup lang="ts">
import { collection, getDocs, type Firestore, type Timestamp } from 'firebase/firestore'
import { questionCount, type AchievementTestDoc } from '~/utils/achievementTest'
import { SEALS, sealColor } from '~/utils/mayaData'

definePageMeta({ layout: 'admin' })

// 到達度診断テストの問題(achievementTests/{sealIndex})の一覧。紋章は 20 固定なので SEALS から
// 行を作り、Firestore の内容(問題数・更新日)を重ねる。編集は /admin/tests/[sealIndex]。
interface Row {
  sealIndex: number
  name: string
  color: string
  questions: number | null
  updated: string
}

const COLOR_LABEL: Record<string, string> = { red: '赤', white: '白', blue: '青', yellow: '黄' }
const rows = ref<Row[]>(SEALS.map((s, i) => ({ sealIndex: i, name: s.name, color: COLOR_LABEL[sealColor(i)], questions: null, updated: '—' })))
const loadError = ref('')

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDocs(collection($firestore as Firestore, 'achievementTests'))
    snap.forEach((d) => {
      const row = rows.value[Number(d.id)]
      if (!row) return
      const data = d.data() as AchievementTestDoc & { updatedAt?: Timestamp }
      row.questions = questionCount(data)
      row.updated = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString().slice(0, 10) : '—'
    })
  } catch {
    loadError.value = '問題の読み込みに失敗しました。時間をおいて再度お試しください。'
  }
})

function questionsLabel(r: Row) {
  return r.questions === null ? '未登録' : `${r.questions}問`
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">到達度診断テスト管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">紋章ごとの自己診断(5カテゴリ × 5問)の問題文と配点を管理します</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <!-- lg 未満はテーブルの代わりにカード一覧。タップで編集画面へ(AdminRecordCard 参照) -->
      <ul class="lg:hidden">
        <AdminRecordCard
          v-for="r in rows"
          :key="r.sealIndex"
          :title="r.name"
          :subtitle="`${r.color}い紋章`"
          :fields="[
            { label: '問題数', value: questionsLabel(r) },
            { label: '更新日', value: r.updated }
          ]"
          :to="`/admin/tests/${r.sealIndex}`"
        />
      </ul>
      <div class="hidden max-h-[70vh] overflow-auto lg:block">
        <table class="w-full text-[13px]">
          <thead class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white [&_th]:pt-2.5 [&_th]:shadow-[inset_0_-1px_0_#e2e8f0] dark:[&_th]:bg-slate-900 dark:[&_th]:shadow-[inset_0_-1px_0_#1e293b]">
            <tr class="text-left text-[11px] uppercase tracking-wide text-slate-400">
              <th class="pb-2.5 pr-3">紋章</th><th class="pb-2.5 pr-3">色</th><th class="pb-2.5 pr-3 text-right">問題数</th><th class="pb-2.5">更新日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.sealIndex"
              class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              @click="navigateTo(`/admin/tests/${r.sealIndex}`)"
            >
              <td class="py-2.5 pr-3 font-semibold">{{ r.name }}</td>
              <td class="py-2.5 pr-3">{{ r.color }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums" :class="r.questions === null ? 'text-red-600 dark:text-red-400' : ''">{{ questionsLabel(r) }}</td>
              <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
