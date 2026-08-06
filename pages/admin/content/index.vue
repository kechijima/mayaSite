<script setup lang="ts">
import { collection, getDocs, type Firestore } from 'firebase/firestore'
import { CONTENT_TYPES, CHARACTER_PROFILE_FIELDS, TONE_PROFILE_FIELDS, buildContentRows, typeLabel, type ContentRow } from '~/utils/diagnosisContentAdmin'

definePageMeta({ layout: 'admin' })

const rows = ref<ContentRow[]>(buildContentRows())
const loadError = ref('')

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDocs(collection($firestore as Firestore, 'diagnosisContent'))
    const byId = new Map(rows.value.map((r) => [r.id, r]))
    snap.forEach((docSnap) => {
      const row = byId.get(docSnap.id)
      if (!row) return
      const data = docSnap.data() as Partial<ContentRow>
      row.name = data.name || row.name
      row.freeText = data.freeText ?? ''
      row.premiumText = data.premiumText ?? ''
      row.status = data.status ?? '下書き'
      row.updated = (data as any).updatedAt?.toDate ? (data as any).updatedAt.toDate().toISOString().slice(0, 10) : row.updated
      if (row.type === 'character') {
        for (const f of CHARACTER_PROFILE_FIELDS) row[f.key] = data[f.key] ?? ''
      }
      if (row.type === 'tone') {
        for (const f of TONE_PROFILE_FIELDS) row[f.key] = data[f.key] ?? ''
      }
    })
  } catch {
    loadError.value = 'コンテンツの読み込みに失敗しました。時間をおいて再度お試しください。'
  }
})

function charCount(text: string) {
  return text ? `${text.length}字` : '—'
}

function openRow(id: string) {
  navigateTo(`/admin/content/${id}`)
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">診断コンテンツ管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">キャラクター(紋章)・銀河の音の診断文言を管理します</span>
    </div>

    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div class="mb-4 flex flex-wrap gap-2.5">
      <input type="text" placeholder="紋章名・音名で検索" class="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべての種別</option><option v-for="t in CONTENT_TYPES" :key="t.type">{{ t.label }}</option>
      </select>
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべてのステータス</option><option>公開</option><option>下書き</option>
      </select>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">種別</th><th class="pb-2.5 pr-3">名称</th><th class="pb-2.5 pr-3 text-right">無料エリア文字数</th><th class="pb-2.5 pr-3 text-right">有料エリア文字数</th><th class="pb-2.5 pr-3">ステータス</th><th class="pb-2.5">更新日</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.id"
              class="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
              @click="openRow(r.id)"
            >
              <td class="py-2.5 pr-3">{{ typeLabel(r.type) }}</td>
              <td class="py-2.5 pr-3">{{ r.name }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ charCount(r.freeText) }}</td>
              <td class="py-2.5 pr-3 text-right tabular-nums">{{ charCount(r.premiumText) }}</td>
              <td class="py-2.5 pr-3">
                <span
                  class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
                  :class="r.status === '公開' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                >{{ r.status }}</span>
              </td>
              <td class="py-2.5 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
