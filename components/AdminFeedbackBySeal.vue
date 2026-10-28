<script setup lang="ts">
import { collection, doc, getDocs, serverTimestamp, setDoc, type Firestore, type Timestamp } from 'firebase/firestore'
import { TEST_BAND_COUNT, normalizeFeedback, type FeedbackTexts } from '~/utils/achievementTestFeedback'
import { SEALS, sealColor } from '~/utils/mayaData'

// 紋章ごとのフィードバック文の2ペイン編集(2026-10-28、要望)。/admin/tests の「結果表示 › 紋章ごと」。
//   lg 以上: 左に20紋章(入力数つき)、右に選んだ紋章の 5カテゴリ × 4段階 をその場で編集・保存。
//   lg 未満: 左の一覧の代わりに上のプルダウンで紋章を選ぶ。
// 選んだ紋章は ?seal= に持つ(再読み込みで同じ紋章が開く)。未保存のまま別の紋章へ移る・画面を離れるときは確認を出す。
// 保存は achievementFeedback/{sealIndex} だけを書く(問題文は /admin/tests/[sealIndex] で)。
const FEEDBACK_TOTAL = 5 * TEST_BAND_COUNT
const COLOR_DOT: Record<string, string> = { red: 'bg-[#be402d]', white: 'bg-[#cfc8b0]', blue: 'bg-[#1c517f]', yellow: 'bg-[#c99a1f]' }

const route = useRoute()
const router = useRouter()
const selected = computed(() => {
  const n = Number(route.query.seal)
  return Number.isInteger(n) && n >= 0 && n < SEALS.length ? n : 0
})

const saved = ref<{ feedback: FeedbackTexts; updated: string }[]>(SEALS.map(() => ({ feedback: normalizeFeedback(null), updated: '—' })))
const draft = ref<FeedbackTexts>(normalizeFeedback(null))
const loading = ref(true)
useLoadingWhile('admin-feedback-by-seal', () => loading.value)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const savedMessage = ref(false)
const { withLoading } = useGlobalLoading()

function filledCount(f: FeedbackTexts) {
  return Object.values(f).flat().filter((t) => t.trim()).length
}
function resetDraft() {
  draft.value = structuredClone(toRaw(saved.value[selected.value].feedback))
  saveError.value = ''
  savedMessage.value = false
}
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value[selected.value].feedback))

onMounted(async () => {
  try {
    const snap = await getDocs(collection(useNuxtApp().$firestore as Firestore, 'achievementFeedback'))
    snap.forEach((d) => {
      const i = Number(d.id)
      if (!saved.value[i]) return
      const data = d.data() as { feedback?: Record<string, unknown>; updatedAt?: Timestamp }
      saved.value[i] = { feedback: normalizeFeedback(data.feedback), updated: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString().slice(0, 10) : '—' }
    })
  } catch {
    loadError.value = 'フィードバック文の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    resetDraft()
    loading.value = false
  }
})
watch(selected, resetDraft)

const DISCARD_MESSAGE = '保存していない変更があります。破棄して移動しますか？'
function select(i: number) {
  if (i === selected.value) return
  if (dirty.value && !window.confirm(DISCARD_MESSAGE)) return
  router.replace({ query: { ...route.query, seal: String(i) } })
}
function onSelectChange(e: Event) {
  const el = e.target as HTMLSelectElement
  const i = Number(el.value)
  select(i)
  el.value = String(selected.value) // 確認で取り消したときに表示を戻す
}

// 未保存のまま他の画面へ移る・タブ(出題文 / 共通設定)を切り替える・ページを閉じるときの確認。
// 紋章の切り替えは select() で確認済みなので、ここでは ?seal 以外が変わるときだけ見る。
onBeforeRouteLeave(() => (dirty.value ? window.confirm(DISCARD_MESSAGE) : true))
onBeforeRouteUpdate((to) => {
  const leaving = to.query.tab !== 'result' || to.query.sub !== 'seal'
  return leaving && dirty.value ? window.confirm(DISCARD_MESSAGE) : true
})
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  savedMessage.value = false
  const i = selected.value
  const feedback = Object.fromEntries(Object.entries(draft.value).map(([k, list]) => [k, list.map((t) => t.trim())])) as FeedbackTexts
  try {
    await withLoading(() => setDoc(doc(useNuxtApp().$firestore as Firestore, 'achievementFeedback', String(i)), {
      sealIndex: i, sealName: SEALS[i].name, feedback, updatedAt: serverTimestamp()
    }))
    saved.value[i] = { feedback, updated: new Date().toISOString().slice(0, 10) }
    if (i === selected.value) {
      draft.value = structuredClone(feedback)
      savedMessage.value = true
    }
  } catch (err) {
    saveError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '権限がありません。再度ログインしてください。'
      : '保存に失敗しました。時間をおいて再度お試しください。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="loadError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>

    <div v-if="!loading" class="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <!-- 左: 紋章の一覧(lg 以上)。固定ヘッダーの下に貼り付き、長ければ中だけスクロール -->
      <nav class="hidden self-start overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 lg:sticky lg:top-[100px] lg:flex lg:max-h-[calc(100vh-120px)] lg:flex-col dark:border-slate-800 dark:bg-slate-900" aria-label="紋章">
        <button
          v-for="(s, i) in SEALS"
          :key="i"
          type="button"
          class="flex flex-none items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors"
          :class="i === selected
            ? 'bg-[#f3ead9] font-bold text-[#8a6b35] dark:bg-[#2b2416] dark:text-[#f0c987]'
            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60'"
          :aria-current="i === selected ? 'true' : undefined"
          @click="select(i)"
        >
          <span class="h-2 w-2 flex-none rounded-full" :class="COLOR_DOT[sealColor(i)]" />
          <span class="min-w-0 flex-1 truncate">{{ s.name }}</span>
          <span
            class="flex-none text-[11px] tabular-nums"
            :class="filledCount(saved[i].feedback) < FEEDBACK_TOTAL ? 'text-red-600 dark:text-red-400' : 'text-slate-400'"
          >{{ filledCount(saved[i].feedback) }}/{{ FEEDBACK_TOTAL }}</span>
        </button>
      </nav>

      <!-- 右: 選んだ紋章の編集 -->
      <section class="min-w-0 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="border-b border-slate-100 p-4 sm:px-5.5 dark:border-slate-800">
          <!-- lg 未満は一覧の代わりにプルダウン -->
          <label class="mb-3 flex flex-col gap-1 lg:hidden">
            <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">紋章</span>
            <select
              :value="selected"
              class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[14px] dark:border-slate-800 dark:bg-slate-900"
              @change="onSelectChange"
            >
              <option v-for="(s, i) in SEALS" :key="i" :value="i">{{ s.name }}（{{ filledCount(saved[i].feedback) }}/{{ FEEDBACK_TOTAL }}）</option>
            </select>
          </label>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p class="text-base font-bold">{{ SEALS[selected].name }}のフィードバック文</p>
            <span class="text-[11px] text-slate-400">更新日 {{ saved[selected].updated }}</span>
            <NuxtLink :to="`/admin/tests/${selected}`" class="ml-auto text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">この紋章の出題文 ›</NuxtLink>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">カテゴリごとに、そのカテゴリの％（5問の点数 ÷ 20点）が入る段階の文が結果画面に出ます。空欄の段階は表示されません。</p>
        </div>

        <div class="p-4 sm:p-5.5">
          <AdminFeedbackFields :feedback="draft" />
        </div>

        <!-- 保存バー。長いフォームの途中でも押せるよう、画面の下に貼り付ける -->
        <div class="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5.5 dark:border-slate-800 dark:bg-slate-900/95">
          <span v-if="saveError" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ saveError }}</span>
          <span v-else-if="dirty" class="text-xs font-semibold text-amber-600 dark:text-amber-400">未保存の変更があります</span>
          <span v-else-if="savedMessage" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">保存しました。</span>
          <div class="ml-auto flex gap-2">
            <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700" :disabled="!dirty || saving" @click="resetDraft">元に戻す</button>
            <button type="button" class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" :disabled="!dirty || saving" @click="save">
              {{ saving ? '保存中…' : '保存する' }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
