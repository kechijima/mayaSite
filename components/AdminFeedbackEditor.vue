<script setup lang="ts">
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import { normalizeFeedback, type FeedbackTexts } from '~/utils/achievementTestFeedback'
import { SEALS } from '~/utils/mayaData'

// 1紋章ぶんのフィードバック文(5カテゴリ × 4段階)の編集。/admin/tests の「結果表示 › 紋章ごと」で紋章を選ぶと
// 一覧と入れ替わって出る(2026-10-28)。保存は achievementFeedback/{sealIndex} だけを書く。文は空でもよい
// (空の段階は結果画面に出ないだけ)。
const props = defineProps<{ sealIndex: number }>()
const emit = defineEmits<{ saved: [filled: number, updated: string] }>()

const draft = ref<FeedbackTexts>(normalizeFeedback(null))
const savedSnapshot = ref('')
const loading = ref(true)
useLoadingWhile('admin-feedback-editor', () => loading.value)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const savedMessage = ref(false)
const { withLoading } = useGlobalLoading()

const dirty = computed(() => !loading.value && JSON.stringify(draft.value) !== savedSnapshot.value)
useUnsavedGuard(dirty)

onMounted(async () => {
  try {
    const snap = await getDoc(doc(useNuxtApp().$firestore as Firestore, 'achievementFeedback', String(props.sealIndex)))
    draft.value = normalizeFeedback(snap.exists() ? snap.data().feedback : null)
  } catch {
    loadError.value = 'フィードバック文の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    savedSnapshot.value = JSON.stringify(draft.value)
    loading.value = false
  }
})

function resetDraft() {
  draft.value = JSON.parse(savedSnapshot.value)
  saveError.value = ''
  savedMessage.value = false
}

async function save() {
  if (saving.value) return
  saving.value = true
  saveError.value = ''
  savedMessage.value = false
  const feedback = Object.fromEntries(Object.entries(draft.value).map(([k, list]) => [k, list.map((t) => t.trim())])) as FeedbackTexts
  try {
    await withLoading(() => setDoc(doc(useNuxtApp().$firestore as Firestore, 'achievementFeedback', String(props.sealIndex)), {
      sealIndex: props.sealIndex, sealName: SEALS[props.sealIndex].name, feedback, updatedAt: serverTimestamp()
    }))
    draft.value = feedback
    savedSnapshot.value = JSON.stringify(feedback)
    savedMessage.value = true
    emit('saved', Object.values(feedback).flat().filter((t) => t).length, new Date().toISOString().slice(0, 10))
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
      <p class="text-xs text-slate-500 dark:text-slate-400">カテゴリごとに、そのカテゴリの％（5問の点数 ÷ 20点）が入る段階の文が結果画面に出ます。空欄の段階は表示されません。</p>
      <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <AdminFeedbackFields :feedback="draft" />
      </div>
      <AdminSaveBar :dirty="dirty" :saving="saving" :error="saveError" :saved="savedMessage" @reset="resetDraft" @save="save">
        保存すると、過去の結果を開いたときも新しい文で表示されます。
      </AdminSaveBar>
    </div>
  </div>
</template>
