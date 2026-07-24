<script setup lang="ts">
import { collection, doc, getDocs, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore'
import { SEALS, TONES } from '~/utils/mayaData'

definePageMeta({ layout: 'admin' })

type ContentType = 'sun' | 'wavespell' | 'tone'

interface ContentRow {
  id: string
  type: ContentType
  index: number
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
  updated: string
}

// デイサイン・トレセーナ・古代マヤ暦全書はSEALS/TONESの再利用や複数カード構造など
// このフラットな freeText/premiumText スキーマに収まらないため対象外。
// CMS化する場合は別途スキーマ拡張が必要。
const CONTENT_TYPES: { type: ContentType; label: string; names: string[] }[] = [
  { type: 'sun', label: '太陽の紋章', names: SEALS.map((s) => s.name) },
  { type: 'wavespell', label: 'ウェイブスペル', names: SEALS.map((s) => s.name) },
  { type: 'tone', label: '銀河の音', names: TONES.map((t) => t.name) }
]

function typeLabel(type: ContentType) {
  return CONTENT_TYPES.find((t) => t.type === type)?.label ?? type
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function buildSkeleton(): ContentRow[] {
  return CONTENT_TYPES.flatMap((ct) =>
    ct.names.map((name, index) => ({
      id: `${ct.type}-${index}`,
      type: ct.type,
      index,
      name,
      freeText: '',
      premiumText: '',
      status: '下書き' as const,
      updated: '—'
    }))
  )
}

const rows = ref<ContentRow[]>(buildSkeleton())
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
      row.freeText = data.freeText ?? ''
      row.premiumText = data.premiumText ?? ''
      row.status = data.status ?? '下書き'
      row.updated = (data as any).updatedAt?.toDate ? (data as any).updatedAt.toDate().toISOString().slice(0, 10) : row.updated
    })
  } catch {
    loadError.value = 'コンテンツの読み込みに失敗しました。時間をおいて再度お試しください。'
  }
})

const editingRow = ref<ContentRow | null>(null)
const saving = ref(false)
const saveError = ref('')

function startEdit(row: ContentRow) {
  editingRow.value = { ...row }
  saveError.value = ''
}

function cancelEdit() {
  editingRow.value = null
}

async function save() {
  if (!editingRow.value) return
  saving.value = true
  saveError.value = ''
  try {
    const { $firestore } = useNuxtApp()
    await updateDoc(doc($firestore as Firestore, 'diagnosisContent', editingRow.value.id), {
      freeText: editingRow.value.freeText,
      premiumText: editingRow.value.premiumText,
      status: editingRow.value.status,
      updatedAt: serverTimestamp()
    })
    const idx = rows.value.findIndex((r) => r.id === editingRow.value!.id)
    if (idx > -1) rows.value[idx] = { ...editingRow.value, updated: todayStr() }
    editingRow.value = null
  } catch (error) {
    saveError.value = (error as { code?: string })?.code === 'permission-denied'
      ? '権限がありません。再度ログインしてください。'
      : '保存に失敗しました。時間をおいて再度お試しください。'
  } finally {
    saving.value = false
  }
}

function charCount(text: string) {
  return text ? `${text.length}字` : '—'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">診断コンテンツ管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">太陽の紋章・ウェイブスペル・銀河の音 KIN 別の診断文言を管理します</span>
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

    <div class="mb-5 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <div class="overflow-x-auto">
        <table class="w-full text-[13px]">
          <thead>
            <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
              <th class="pb-2.5 pr-3">種別</th><th class="pb-2.5 pr-3">名称</th><th class="pb-2.5 pr-3 text-right">無料エリア文字数</th><th class="pb-2.5 pr-3 text-right">有料エリア文字数</th><th class="pb-2.5 pr-3">ステータス</th><th class="pb-2.5 pr-3">更新日</th><th class="pb-2.5"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in rows"
              :key="r.id"
              class="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
              :class="editingRow?.id === r.id ? 'bg-brass-700/5' : ''"
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
              <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ r.updated }}</td>
              <td class="py-2.5">
                <button class="text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300" @click="startEdit(r)">
                  {{ editingRow?.id === r.id ? '編集中' : '編集' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editingRow" class="rounded-xl border border-brass-700 bg-brass-700/5 p-5.5">
      <h3 class="mb-3.5 text-sm font-bold">編集中：{{ typeLabel(editingRow.type) }}「{{ editingRow.name }}」</h3>

      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">種別</div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">{{ typeLabel(editingRow.type) }}</div>
        </div>
        <div>
          <div class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">名称</div>
          <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">{{ editingRow.name }}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            無料エリア本文
            <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
          </div>
          <textarea v-model="editingRow.freeText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
        </div>
        <div>
          <div class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            有料エリア本文
            <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">今回未使用</span>
          </div>
          <textarea v-model="editingRow.premiumText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
        </div>
      </div>
      <div v-if="saveError" class="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{{ saveError }}</div>
      <div class="mt-4 flex items-center justify-between">
        <div class="flex gap-3.5 text-sm text-slate-600 dark:text-slate-300">
          <label class="flex items-center gap-1.5"><input v-model="editingRow.status" type="radio" value="公開" name="status" class="accent-brass-700" /> 公開</label>
          <label class="flex items-center gap-1.5"><input v-model="editingRow.status" type="radio" value="下書き" name="status" class="accent-brass-700" /> 下書き</label>
        </div>
        <div class="flex gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="cancelEdit">キャンセル</button>
          <button class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存する' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
