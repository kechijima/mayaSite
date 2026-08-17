<script setup lang="ts">
import { doc, getDoc, serverTimestamp, updateDoc, type Firestore } from 'firebase/firestore'
import { CHARACTER_PROFILE_FIELDS, TONE_PROFILE_FIELDS, buildContentRow, typeLabel, type ContentRow } from '~/utils/diagnosisContentAdmin'
import { formatKinCelebrities, type KinCelebrity } from '~/utils/kinCelebrities'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const id = route.params.id as string

const row = ref<ContentRow | null>(buildContentRow(id))
const loadError = ref('')
const notFound = ref(!row.value)

// KIN別の有名人。Firestoreにはオブジェクトの配列で入っているので、「1行1人・｜区切り」の
// テキストに直して見せる(変換は utils/kinCelebrities.ts)。
//
// 現状は表示のみで、保存対象に含めていない。diagnosisContent は firestore.rules で書き込みを
// 全面拒否している(管理者認証が未導入のため — CLAUDE.md参照)ので、編集させても必ず失敗する。
// 書き込みを有効化する際は、この ref を編集可能に戻し、save() の updateDoc に
// `kinCelebrities: parseKinCelebrities(celebritiesText.value)` を足せばよい。
const celebritiesText = ref('')
const celebritiesCount = computed(() => celebritiesText.value.split('\n').filter((l) => l.trim()).length)

const freeProfileFields = CHARACTER_PROFILE_FIELDS.filter((f) => f.tier === 'free')
const premiumProfileFields = CHARACTER_PROFILE_FIELDS.filter((f) => f.tier === 'premium')
const toneProfileFields = TONE_PROFILE_FIELDS

// kind:'list' フィールド(箇条書き)の編集用ヘルパー — 項目の追加・削除・並べ替え。
function listOf(key: string): string[] {
  const value = row.value?.[key]
  return Array.isArray(value) ? value : []
}
function addListItem(key: string) {
  if (!row.value) return
  row.value[key] = [...listOf(key), '']
}
function removeListItem(key: string, index: number) {
  if (!row.value) return
  row.value[key] = listOf(key).filter((_, i) => i !== index)
}
function moveListItem(key: string, index: number, delta: number) {
  if (!row.value) return
  const items = [...listOf(key)]
  const target = index + delta
  if (target < 0 || target >= items.length) return
  ;[items[index], items[target]] = [items[target], items[index]]
  row.value[key] = items
}

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
        for (const f of CHARACTER_PROFILE_FIELDS) row.value[f.key] = data[f.key] ?? (f.kind === 'list' ? [] : '')
      }
      if (row.value.type === 'tone') {
        for (const f of TONE_PROFILE_FIELDS) row.value[f.key] = data[f.key] ?? (f.kind === 'list' ? [] : '')
      }
      if (row.value.type === 'kin') {
        celebritiesText.value = formatKinCelebrities(((data as { kinCelebrities?: KinCelebrity[] }).kinCelebrities) ?? [])
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
    // 保存直前に空の箇条書き行(未入力のまま追加した項目など)を取り除く。
    function fieldValue(f: { key: string; kind: string }) {
      const value = row.value![f.key]
      return f.kind === 'list' ? (Array.isArray(value) ? value.filter((v) => v.trim()) : []) : value ?? ''
    }
    const profileUpdates = row.value.type === 'character'
      ? Object.fromEntries(CHARACTER_PROFILE_FIELDS.map((f) => [f.key, fieldValue(f)]))
      : row.value.type === 'tone'
        ? Object.fromEntries(TONE_PROFILE_FIELDS.map((f) => [f.key, fieldValue(f)]))
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
              総合解説（無料エリア本文）
              <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
            </div>
            <textarea v-model="row.freeText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
          </div>
          <div>
            <div class="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
              有料エリア本文
              <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">今回未使用</span>
            </div>
            <textarea v-model="row.premiumText" class="min-h-[120px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
          </div>
        </div>

        <template v-if="row.type === 'kin'">
          <div class="mb-2 mt-6 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            同じKINを持つ有名人（{{ celebritiesCount }}人）
            <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
            <span class="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">表示のみ（編集不可）</span>
          </div>
          <p class="mb-1.5 text-[11.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            1行に1人、「名前｜生年月日｜分野」の形式です。内容の変更は
            <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">scripts/celebrities.data.ts</code> を編集して
            <code class="rounded bg-slate-100 px-1 dark:bg-slate-800">npm run seed:celebrities</code> を実行してください。
          </p>
          <textarea
            :value="celebritiesText"
            readonly
            spellcheck="false"
            class="min-h-[260px] w-full cursor-default rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[12.5px] leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
          ></textarea>
        </template>

        <template v-if="row.type === 'tone'">
          <div class="mb-2 mt-6 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            銀河の音プロフィール項目
            <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div v-for="f in toneProfileFields" :key="f.key">
              <div class="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">{{ f.label }}</div>
              <input
                v-if="f.kind === 'text'"
                v-model="row[f.key]"
                type="text"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              />
              <textarea
                v-else-if="f.kind === 'textarea'"
                v-model="row[f.key]"
                class="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"
              ></textarea>
              <div v-else class="space-y-2">
                <div v-for="(item, i) in listOf(f.key)" :key="i" class="flex items-center gap-1.5">
                  <input
                    v-model="listOf(f.key)[i]"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === 0" @click="moveListItem(f.key, i, -1)">↑</button>
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === listOf(f.key).length - 1" @click="moveListItem(f.key, i, 1)">↓</button>
                  <button type="button" class="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400" @click="removeListItem(f.key, i)">削除</button>
                </div>
                <button type="button" class="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-brass-700 dark:border-slate-700 dark:text-gold-300" @click="addListItem(f.key)">+ 項目を追加</button>
              </div>
            </div>
          </div>
        </template>

        <template v-if="row.type === 'character'">
          <div class="mb-2 mt-6 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            紋章プロフィール項目（無料表示）
            <span class="rounded-full border border-slate-300 px-2 py-0.5 text-[10.5px] font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">非会員・無料会員に表示</span>
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div v-for="f in freeProfileFields" :key="f.key">
              <div class="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">{{ f.label }}</div>
              <input
                v-if="f.kind === 'text'"
                v-model="row[f.key]"
                type="text"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              />
              <textarea
                v-else-if="f.kind === 'textarea'"
                v-model="row[f.key]"
                class="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"
              ></textarea>
              <div v-else class="space-y-2">
                <div v-for="(item, i) in listOf(f.key)" :key="i" class="flex items-center gap-1.5">
                  <input
                    v-model="listOf(f.key)[i]"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === 0" @click="moveListItem(f.key, i, -1)">↑</button>
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === listOf(f.key).length - 1" @click="moveListItem(f.key, i, 1)">↓</button>
                  <button type="button" class="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400" @click="removeListItem(f.key, i)">削除</button>
                </div>
                <button type="button" class="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-brass-700 dark:border-slate-700 dark:text-gold-300" @click="addListItem(f.key)">+ 項目を追加</button>
              </div>
            </div>
          </div>

          <div class="mb-2 mt-6 flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            紋章プロフィール項目（有料プランに表示）
            <span class="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">有料エリア</span>
          </div>
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div v-for="f in premiumProfileFields" :key="f.key">
              <div class="mb-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">{{ f.label }}</div>
              <input
                v-if="f.kind === 'text'"
                v-model="row[f.key]"
                type="text"
                class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
              />
              <textarea
                v-else-if="f.kind === 'textarea'"
                v-model="row[f.key]"
                class="min-h-[100px] w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"
              ></textarea>
              <div v-else class="space-y-2">
                <div v-for="(item, i) in listOf(f.key)" :key="i" class="flex items-center gap-1.5">
                  <input
                    v-model="listOf(f.key)[i]"
                    type="text"
                    class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900"
                  />
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === 0" @click="moveListItem(f.key, i, -1)">↑</button>
                  <button type="button" class="rounded-lg border border-slate-200 px-2 py-2 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700 dark:text-slate-400" :disabled="i === listOf(f.key).length - 1" @click="moveListItem(f.key, i, 1)">↓</button>
                  <button type="button" class="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 dark:border-red-900 dark:text-red-400" @click="removeListItem(f.key, i)">削除</button>
                </div>
                <button type="button" class="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-brass-700 dark:border-slate-700 dark:text-gold-300" @click="addListItem(f.key)">+ 項目を追加</button>
              </div>
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
