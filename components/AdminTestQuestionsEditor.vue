<script setup lang="ts">
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import { QUESTIONS_PER_CATEGORY, TEST_CATEGORY_KEYS, type AchievementTestDoc, type TestCategory, type TestCategoryKey } from '~/utils/achievementTest'
import { SEALS } from '~/utils/mayaData'

// 到達度診断テストの問題の編集(1紋章ぶん)。/admin/tests の「出題文」タブで紋章を選ぶと一覧と入れ替わって出る
// (2026-10-28。それまでは別ページ /admin/tests/[sealIndex])。5カテゴリ × 5問の文と、どちらの答えが 4 点かを直せる。
// 保存は achievementTests/{sealIndex} を丸ごと書く(管理者のみ、firestore.rules)。
// 構成(カテゴリ5つ・各5問・3択)は原本の形に固定していて、問を増減する UI は付けていない —
// 採点(utils/achievementTest.ts)と rules の answers.size() == 25 がその前提のため。
// 問題文はドキュメントにだけあり、受験結果には保存していない。ここで文を直すと、管理画面の
// 過去の答案にも直した後の文が出る(回答と点数は当時のまま)。
const props = defineProps<{ sealIndex: number }>()
const emit = defineEmits<{ saved: [questions: number] }>()
const sealName = SEALS[props.sealIndex].name

const CATEGORY_DEFAULT: Record<TestCategoryKey, { name: string; description: string }> = {
  thinking: { name: '思考', description: '思考とは、あなたが行動に移す前に心の中で考える方法についての質問です。' },
  action: { name: '行動', description: '行動とは、思考から得られた答えを使ってどのような動きをするのかについての質問です。' },
  relationship: { name: '人間関係', description: '人間関係とは、自分以外の人に対してどのように対応するかについての質問です。' },
  belief: { name: '信念', description: '信念とは、自分自身の生き方や人生などの長期的視点で正しいと信じていることに関しての質問です。' },
  skill: { name: 'スキル', description: 'スキルとは、思考・行動・人間関係・信念を日々の場面で発揮するために身についている力についての質問です。' }
}

// 編集用の形。配点は「そう思う」が 4 点(agree)か「思わない」が 4 点(disagree)かの2択で持つ。
interface DraftQuestion {
  text: string
  high: 'agree' | 'disagree'
}
interface DraftCategory {
  key: TestCategoryKey
  name: string
  description: string
  questions: DraftQuestion[]
}

const categories = ref<DraftCategory[]>([])
const savedSnapshot = ref('')
const loading = ref(true)
useLoadingWhile('admin-test-questions', () => loading.value)
const isNew = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const savedMessage = ref(false)
const { withLoading } = useGlobalLoading()

const dirty = computed(() => !loading.value && JSON.stringify(categories.value) !== savedSnapshot.value)
useUnsavedGuard(dirty)

function emptyDraft(): DraftCategory[] {
  return TEST_CATEGORY_KEYS.map((key) => ({
    key,
    ...CATEGORY_DEFAULT[key],
    questions: Array.from({ length: QUESTIONS_PER_CATEGORY }, () => ({ text: '', high: 'agree' as const }))
  }))
}

function toDraft(data: AchievementTestDoc): DraftCategory[] {
  return TEST_CATEGORY_KEYS.map((key) => {
    const c = data.categories.find((x) => x.key === key)
    const questions: DraftQuestion[] = (c?.questions ?? []).map((q) => ({ text: q.text, high: q.scores[0] === 4 ? 'agree' : 'disagree' }))
    while (questions.length < QUESTIONS_PER_CATEGORY) questions.push({ text: '', high: 'agree' })
    return { key, name: c?.name || CATEGORY_DEFAULT[key].name, description: c?.description ?? CATEGORY_DEFAULT[key].description, questions: questions.slice(0, QUESTIONS_PER_CATEGORY) }
  })
}

function toDoc(): AchievementTestDoc {
  const cats: TestCategory[] = categories.value.map((c) => ({
    key: c.key,
    name: c.name.trim(),
    description: c.description.trim(),
    questions: c.questions.map((q) => ({ text: q.text.trim(), scores: q.high === 'agree' ? [4, 2, 0] : [0, 2, 4] }))
  }))
  return { sealIndex: props.sealIndex, sealName, categories: cats }
}

function resetDraft() {
  categories.value = JSON.parse(savedSnapshot.value)
  saveError.value = ''
  savedMessage.value = false
}

onMounted(async () => {
  try {
    const snap = await getDoc(doc(useNuxtApp().$firestore as Firestore, 'achievementTests', String(props.sealIndex)))
    if (snap.exists()) {
      categories.value = toDraft(snap.data() as AchievementTestDoc)
    } else {
      isNew.value = true
      categories.value = emptyDraft()
    }
    savedSnapshot.value = JSON.stringify(categories.value)
  } catch {
    loadError.value = '問題の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
})

// 点数配分の表示。4点にしたい答え(そう思う / 思わない)を押すと反対が0点になる。「どちらでもない」は常に2点。
function scoringPreview(q: DraftQuestion): { label: string; points: number; value: DraftQuestion['high'] | null }[] {
  return [
    { label: 'そう思う', points: q.high === 'agree' ? 4 : 0, value: 'agree' },
    { label: 'どちらでもない', points: 2, value: null },
    { label: '思わない', points: q.high === 'disagree' ? 4 : 0, value: 'disagree' }
  ]
}

const missing = computed(() => categories.value.flatMap((c) => c.questions.map((q, qi) => (q.text.trim() ? null : `${c.name} ${qi + 1}`)).filter(Boolean)))

async function save() {
  if (saving.value) return
  saveError.value = ''
  savedMessage.value = false
  if (missing.value.length) {
    saveError.value = `問題文が空の項目があります: ${missing.value.join('、')}`
    return
  }
  saving.value = true
  try {
    const data = toDoc()
    await withLoading(() => setDoc(doc(useNuxtApp().$firestore as Firestore, 'achievementTests', String(props.sealIndex)), { ...data, updatedAt: serverTimestamp() }))
    categories.value = toDraft(data)
    savedSnapshot.value = JSON.stringify(categories.value)
    isNew.value = false
    savedMessage.value = true
    emit('saved', data.categories.reduce((n, c) => n + c.questions.length, 0))
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
    <div v-if="loadError" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>
    <div v-else-if="!loading" class="space-y-4">
      <p class="text-xs text-slate-500 dark:text-slate-400">
        各問の点数配分は、4点にする答え（そう思う / 思わない）を押して切り替えます。反対の答えは0点、「どちらでもない」は常に2点です。
        <template v-if="isNew">この紋章の問題はまだ登録されていません。</template>
      </p>
    <div v-for="(c, ci) in categories" :key="c.key" class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5.5 dark:border-slate-800 dark:bg-slate-900">
      <div class="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <p class="text-sm font-bold">{{ c.name }}</p>
        <span class="text-[11px] text-slate-400">{{ ci + 1 }} / {{ categories.length }}</span>
      </div>
      <div class="mb-4">
        <div class="mb-1.5 flex text-xs font-bold text-slate-600 dark:text-slate-300">カテゴリの説明（受験画面の冒頭に表示）</div>
        <textarea v-model="c.description" rows="2" class="w-full rounded-lg border border-slate-200 bg-white p-3 text-[13px] dark:border-slate-800 dark:bg-slate-900"></textarea>
      </div>
      <ol class="space-y-3">
        <li v-for="(q, qi) in c.questions" :key="qi" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 lg:grid-cols-[auto_1fr_auto]">
          <span class="pt-2 text-[12px] tabular-nums text-slate-400">{{ ci * QUESTIONS_PER_CATEGORY + qi + 1 }}</span>
          <textarea
            v-model="q.text"
            rows="2"
            class="w-full rounded-lg border bg-white p-2.5 text-[13px] dark:bg-slate-900"
            :class="!q.text.trim() ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-800'"
          ></textarea>
          <!-- 点数配分。そう思う / どちらでもない / 思わない の点数を並べ、4点にしたい答えを押して切り替える
               (「どちらでもない」は常に2点なので押せない)。保存される形は [4,2,0] か [0,2,4]。 -->
          <div class="col-start-2 rounded-lg border border-slate-200 p-2.5 lg:col-start-3 lg:w-[320px] dark:border-slate-700">
            <div class="mb-1.5 flex items-baseline justify-between gap-2">
              <span class="whitespace-nowrap text-[11px] font-bold text-slate-500 dark:text-slate-400">点数配分</span>
              <span class="text-[10.5px] text-slate-400">4点にする答えを押して切り替え</span>
            </div>
            <div class="grid grid-cols-3 gap-1 text-center text-[11px]" role="radiogroup" aria-label="点数配分">
              <button
                v-for="cell in scoringPreview(q)"
                :key="cell.label"
                type="button"
                :role="cell.value ? 'radio' : undefined"
                :aria-checked="cell.value ? q.high === cell.value : undefined"
                :disabled="!cell.value"
                class="rounded-md px-1 py-1 transition-colors"
                :class="cell.points === 4
                  ? 'bg-brass-700 font-bold text-white dark:bg-gold-300 dark:text-slate-900'
                  : cell.value
                    ? 'cursor-pointer bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-brass-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-amber-950/40 dark:hover:text-gold-300'
                    : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                @click="cell.value && (q.high = cell.value)"
              >
                <div class="whitespace-nowrap">{{ cell.label }}</div>
                <div class="tabular-nums">{{ cell.points }}点</div>
              </button>
            </div>
          </div>
        </li>
      </ol>
    </div>

      <AdminSaveBar :dirty="dirty" :saving="saving" :error="saveError" :saved="savedMessage" @reset="resetDraft" @save="save">
        保存すると、次に受ける人からこの内容で出題されます。過去の受験結果の点数は変わりません。
      </AdminSaveBar>
    </div>
  </div>
</template>
