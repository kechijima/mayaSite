<script setup lang="ts">
definePageMeta({ layout: 'admin' })

interface ContentRow {
  id: number
  type: string
  name: string
  freeText: string
  premiumText: string
  status: '公開' | '下書き'
  updated: string
}

const contentTypes = ['太陽の紋章', 'ウェイブスペル', 'デイサイン', 'トレセーナ', '古代マヤ暦全書']

const rows = ref<ContentRow[]>([
  { id: 1, type: '太陽の紋章', name: '黄色い太陽', freeText: '黄色い太陽を紋章に持つ人は、周囲を明るく照らす太陽そのもののような存在感を持っています。', premiumText: '', status: '公開', updated: '2026-06-30' },
  { id: 2, type: 'ウェイブスペル', name: '白い風', freeText: '白い風のウェイブスペルを持つ人は、言葉や感性を通じて人と人とをつなぐ力を秘めています。', premiumText: '', status: '公開', updated: '2026-06-28' },
  { id: 3, type: 'デイサイン', name: '赤い地球', freeText: '赤い地球のデイサインを持つあなたは、物事を大きな視点で捉え、周囲との調和を自然にとる才能があります。', premiumText: 'この項目では、あなたが力を発揮しやすい環境や具体的な行動パターンを詳しく解説しています。仕事選びや人間関係の距離感に迷ったとき、道しるべとなる内容です。旅、異業種交流、多様な世代との対話によってこの資質はさらに磨かれていきます。', status: '公開', updated: '2026-07-10' },
  { id: 4, type: 'トレセーナ', name: '白い世界の橋渡し', freeText: 'トレセーナは13日を1区切りとする運気の波です。', premiumText: 'あなたが今どの周期にいて、次にどんな流れが訪れるのかを13日ごとに解説。日々の意思決定のタイミングを見極めるための実践的な指針をお届けします。', status: '公開', updated: '2026-07-08' },
  { id: 5, type: '古代マヤ暦全書', name: '相性診断（恋愛・仕事）', freeText: '', premiumText: 'KIN番号の組み合わせから、パートナーや同僚との相性を紋章ごとに読み解きます。', status: '下書き', updated: '2026-07-05' }
])

const editingRow = ref<ContentRow | null>(null)
const isNew = ref(false)
let nextId = 6

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function startEdit(row: ContentRow) {
  editingRow.value = { ...row }
  isNew.value = false
}

function startCreate() {
  editingRow.value = { id: 0, type: contentTypes[0], name: '', freeText: '', premiumText: '', status: '下書き', updated: todayStr() }
  isNew.value = true
}

function cancelEdit() {
  editingRow.value = null
}

function save() {
  if (!editingRow.value) return
  editingRow.value.updated = todayStr()
  if (isNew.value) {
    rows.value.push({ ...editingRow.value, id: nextId++ })
  } else {
    const idx = rows.value.findIndex((r) => r.id === editingRow.value!.id)
    if (idx > -1) rows.value[idx] = { ...editingRow.value }
  }
  editingRow.value = null
}

function charCount(text: string) {
  return text ? `${text.length}字` : '—'
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">診断コンテンツ管理</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">太陽の紋章・ウェイブスペルなど KIN 別の診断文言を管理します</span>
    </div>

    <div class="mb-4 flex flex-wrap gap-2.5">
      <input type="text" placeholder="紋章名・KIN番号で検索" class="min-w-[180px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべての種別</option><option v-for="t in contentTypes" :key="t">{{ t }}</option>
      </select>
      <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
        <option>すべてのステータス</option><option>公開</option><option>下書き</option>
      </select>
      <button class="rounded-lg bg-brass-700 px-4.5 py-2 text-sm font-bold text-white" @click="startCreate">＋ 新規コンテンツ</button>
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
              :class="!isNew && editingRow?.id === r.id ? 'bg-brass-700/5' : ''"
            >
              <td class="py-2.5 pr-3">{{ r.type }}</td>
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
                  {{ !isNew && editingRow?.id === r.id ? '編集中' : '編集' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="editingRow" class="rounded-xl border border-brass-700 bg-brass-700/5 p-5.5">
      <h3 class="mb-3.5 text-sm font-bold">{{ isNew ? '新規コンテンツを作成' : `編集中：${editingRow.type}「${editingRow.name}」` }}</h3>

      <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">種別</label>
          <select v-model="editingRow.type" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
            <option v-for="t in contentTypes" :key="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">名称</label>
          <input v-model="editingRow.name" type="text" placeholder="例：黄色い太陽" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
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
            <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">有料会員のみ表示</span>
          </div>
          <textarea v-model="editingRow.premiumText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between">
        <div class="flex gap-3.5 text-sm text-slate-600 dark:text-slate-300">
          <label class="flex items-center gap-1.5"><input v-model="editingRow.status" type="radio" value="公開" name="status" class="accent-brass-700" /> 公開</label>
          <label class="flex items-center gap-1.5"><input v-model="editingRow.status" type="radio" value="下書き" name="status" class="accent-brass-700" /> 下書き</label>
        </div>
        <div class="flex gap-2">
          <button class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="cancelEdit">キャンセル</button>
          <button class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white" @click="save">保存する</button>
        </div>
      </div>
    </div>
  </div>
</template>
