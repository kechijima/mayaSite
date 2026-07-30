<script setup lang="ts">
import { doc, getDoc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore'
import { CHARACTER_PROFILE_FIELDS, buildContentRow, typeLabel, type ContentRow } from '~/utils/diagnosisContentAdmin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const id = route.params.id as string

const row = ref<ContentRow | null>(buildContentRow(id))
const loadError = ref('')
const notFound = ref(!row.value)

onMounted(async () => {
  if (!row.value) return
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDoc(doc($firestore as Firestore, 'diagnosisContent', id))
    if (snap.exists()) {
      const data = snap.data() as Partial<ContentRow>
      row.value.name = data.name || row.value.name
      row.value.freeText = data.freeText ?? ''
      row.value.premiumText = data.premiumText ?? ''
      row.value.status = data.status ?? '下書き'
      if (row.value.type === 'character') {
        for (const f of CHARACTER_PROFILE_FIELDS) row.value[f.key] = data[f.key] ?? ''
      }
    }
  } catch {
    loadError.value = 'コンテンツの読み込みに失敗しました。時間をおいて再度お試しください。'
  }
})

const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

async function save() {
  if (!row.value) return
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    const { $firestore } = useNuxtApp()
    const profileUpdates = row.value.type === 'character'
      ? Object.fromEntries(CHARACTER_PROFILE_FIELDS.map((f) => [f.key, row.value![f.key] ?? '']))
      : {}
    await updateDoc(doc($firestore as Firestore, 'diagnosisContent', id), {
      name: row.value.name,
      freeText: row.value.freeText,
      premiumText: row.value.premiumText,
      status: row.value.status,
      updatedAt: serverTimestamp(),
      ...profileUpdates
    })
    saved.value = true
  } catch (error) {
    saveError.value = (error as { code?: string })?.code === 'permission-denied'
      ? '現在この項目の保存は無効化されています。'
      : '保存に失敗しました。時間をおいて再度お試しください。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/content" class="mb-4 inline-block text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">‹ 診断コンテンツ一覧に戻る</NuxtLink>

    <div v-if="notFound" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      指定されたコンテンツが見つかりませんでした。
    </div>

    <template v-else-if="row">
      <div class="mb-6">
        <h1 class="text-xl font-bold">編集：{{ typeLabel(row.type) }}「{{ row.name }}」</h1>
      </div>

      <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {{ loadError }}
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <div class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">種別</div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">{{ typeLabel(row.type) }}</div>
          </div>
          <div>
            <div class="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">名称</div>
            <input v-model="row.name" type="text" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <div class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              {{ row.type === 'character' ? '総合解説（無料エリア本文）' : '無料エリア本文' }}
              <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
            </div>
            <textarea v-model="row.freeText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
          </div>
          <div v-if="row.type !== 'character'">
            <div class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              有料エリア本文
              <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">今回未使用</span>
            </div>
            <textarea v-model="row.premiumText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
          </div>
        </div>

        <template v-if="row.type === 'character'">
          <div class="mb-2 mt-6 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            紋章プロフィール項目（ライトプラン以上に表示）
            <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">有料エリア</span>
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div v-for="f in CHARACTER_PROFILE_FIELDS" :key="f.key">
              <div class="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">{{ f.label }}</div>
              <input
                v-if="f.kind === 'text'"
                v-model="row[f.key]"
                type="text"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              />
              <textarea
                v-else
                v-model="row[f.key]"
                class="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"
              ></textarea>
            </div>
          </div>
        </template>

        <div v-if="saveError" class="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">{{ saveError }}</div>
        <div v-if="saved" class="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">保存しました。</div>
        <div class="mt-4 flex items-center justify-between">
          <div class="flex gap-3.5 text-sm text-slate-600 dark:text-slate-300">
            <label class="flex items-center gap-1.5"><input v-model="row.status" type="radio" value="公開" name="status" class="accent-brass-700" /> 公開</label>
            <label class="flex items-center gap-1.5"><input v-model="row.status" type="radio" value="下書き" name="status" class="accent-brass-700" /> 下書き</label>
          </div>
          <div class="flex gap-2">
            <NuxtLink to="/admin/content" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">キャンセル</NuxtLink>
            <button class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存する' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
