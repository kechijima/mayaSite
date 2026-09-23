<script setup lang="ts">
import { doc, getDoc, type Firestore } from 'firebase/firestore'
import { buildHistoryRow, formatDateTime, historyTypeChipClass, historyTypeLabel, type HistoryDoc, type HistoryRow } from '~/utils/diagnosisHistoryAdmin'
import { genderLabel } from '~/utils/gender'

definePageMeta({ layout: 'admin' })

// 診断履歴の詳細(読み取り専用 — 履歴は変更しないログなので編集は無い)。
// 2026-09-23 に /admin/history のモーダルからページへ移した。

const route = useRoute()
const id = route.params.id as string

const row = ref<HistoryRow | null>(null)
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDoc(doc($firestore as Firestore, 'diagnosisHistory', id))
    if (!snap.exists()) {
      notFound.value = true
      return
    }
    row.value = buildHistoryRow(snap.id, snap.data() as HistoryDoc)
  } catch {
    loadError.value = '診断履歴の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <NuxtLink to="/admin/history" class="mb-4 inline-block text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">‹ 診断履歴に戻る</NuxtLink>

    <div v-if="notFound" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      指定された診断履歴が見つかりませんでした。
    </div>
    <div v-else-if="loadError" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <p v-else-if="loading" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>

    <template v-else-if="row">
      <div class="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h1 class="text-xl font-bold">{{ row.primaryName }}</h1>
          <span class="text-xs tabular-nums text-slate-500 dark:text-slate-400">{{ formatDateTime(row.createdAt) }}</span>
        </div>
        <span class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold" :class="historyTypeChipClass(row.type)">{{ historyTypeLabel(row.type) }}</span>
      </div>

      <div class="space-y-4">
        <div v-for="(p, i) in row.people" :key="i" class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
          <p class="mb-3 text-sm font-bold">
            {{ row.type === 'compatibility' ? (i === 0 ? 'あなた' : `相手${i}`) : p.name }}
            <span v-if="row.type === 'compatibility'" class="ml-1 font-normal text-slate-500 dark:text-slate-400">（{{ p.name }}）</span>
          </p>
          <dl class="grid grid-cols-1 gap-y-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            <div><dt class="text-slate-400">生年月日</dt><dd class="font-semibold tabular-nums">{{ p.birthdate }}</dd></div>
            <div><dt class="text-slate-400">性別</dt><dd class="font-semibold">{{ genderLabel(p.gender) }}</dd></div>
            <div><dt class="text-slate-400">KIN番号</dt><dd class="font-semibold tabular-nums">KIN {{ p.kin }}</dd></div>
            <div><dt class="text-slate-400">太陽の紋章</dt><dd class="font-semibold">{{ p.sealName }}</dd></div>
            <div><dt class="text-slate-400">銀河の音</dt><dd class="font-semibold">{{ p.toneName }}</dd></div>
            <div><dt class="text-slate-400">ウェイブスペル</dt><dd class="font-semibold">{{ p.wavespellSealName }}</dd></div>
          </dl>
        </div>
      </div>
    </template>
  </div>
</template>
