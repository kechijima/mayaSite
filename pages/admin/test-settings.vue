<script setup lang="ts">
import { doc, getDoc, serverTimestamp, setDoc, type Firestore } from 'firebase/firestore'
import {
  DEFAULT_TEST_DISPLAY_SETTINGS,
  TEST_BAND_RANGE,
  formatYen,
  isSafeExternalUrl,
  normalizeDisplaySettings,
  type TestDisplaySettings
} from '~/utils/achievementTestFeedback'

definePageMeta({ layout: 'admin' })

// 到達度診断テストの結果画面の表示設定(2026-10-27)。achievementTestSettings/display に1つ。
//   - 段階(71％以上 / 51〜70％ / 31〜50％ / 30％以下)ごとの名前と一言。全紋章共通。区切りの値は固定。
//   - 結果画面の下に出す購入カード3枚(ベーシック / オラクル / 攻略ガイド)の商品名・価格・リンク・Coming soon。
// 紋章ごとのフィードバック文はここではなく /admin/tests/[sealIndex] で編集する。
// ドキュメントがまだ無いときは既定値(utils/achievementTestFeedback.ts)を出し、保存で作る。

const settings = ref<TestDisplaySettings>(structuredClone(DEFAULT_TEST_DISPLAY_SETTINGS))
// 価格は入力欄では文字列で持つ(空欄 = 価格を出さない)
const priceInputs = ref<string[]>([])
const loading = ref(true)
useLoadingWhile('admin-test-settings', () => loading.value)
const isNew = ref(false)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)
const { withLoading } = useGlobalLoading()

function syncPriceInputs() {
  priceInputs.value = settings.value.products.map((p) => (p.price === null ? '' : String(p.price)))
}

onMounted(async () => {
  try {
    const { $firestore } = useNuxtApp()
    const snap = await getDoc(doc($firestore as Firestore, 'achievementTestSettings', 'display'))
    isNew.value = !snap.exists()
    settings.value = normalizeDisplaySettings(snap.exists() ? (snap.data() as Partial<TestDisplaySettings>) : null)
  } catch {
    loadError.value = '設定の読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    syncPriceInputs()
    loading.value = false
  }
})

const errors = computed(() => {
  const out: string[] = []
  settings.value.bands.forEach((b, i) => {
    if (!b.label.trim()) out.push(`${TEST_BAND_RANGE[i]} の名前が空です`)
  })
  settings.value.products.forEach((p, i) => {
    if (!p.name.trim()) out.push(`カード${i + 1} の商品名が空です`)
    const price = priceInputs.value[i]?.trim() ?? ''
    if (price && !/^\d+$/.test(price)) out.push(`${p.name || `カード${i + 1}`} の価格は半角数字で入力してください`)
    if (p.url.trim() && !isSafeExternalUrl(p.url)) out.push(`${p.name || `カード${i + 1}`} のリンクは http:// か https:// で始まるURLにしてください`)
  })
  return out
})

function pricePreview(i: number) {
  const v = priceInputs.value[i]?.trim() ?? ''
  return /^\d+$/.test(v) ? formatYen(Number(v)) : '（価格を表示しない）'
}

async function save() {
  if (saving.value) return
  saveError.value = ''
  saved.value = false
  if (errors.value.length) {
    saveError.value = errors.value.join('、')
    return
  }
  saving.value = true
  const data: TestDisplaySettings = {
    bands: settings.value.bands.map((b) => ({ label: b.label.trim(), message: b.message.trim() })),
    products: settings.value.products.map((p, i) => {
      const price = priceInputs.value[i]?.trim() ?? ''
      return { key: p.key, name: p.name.trim(), price: price ? Number(price) : null, url: p.url.trim(), comingSoon: p.comingSoon }
    })
  }
  try {
    const { $firestore } = useNuxtApp()
    await withLoading(() => setDoc(doc($firestore as Firestore, 'achievementTestSettings', 'display'), { ...data, updatedAt: serverTimestamp() }))
    settings.value = data
    syncPriceInputs()
    isNew.value = false
    saved.value = true
  } catch (err) {
    saveError.value = (err as { code?: string })?.code === 'permission-denied'
      ? '権限がありません。再度ログインしてください。'
      : '保存に失敗しました。時間をおいて再度お試しください。'
  } finally {
    saving.value = false
  }
}

const inputClass = 'w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[13px] dark:border-slate-800 dark:bg-slate-900'
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-xl font-bold">テスト結果の表示設定</h1>
      <span class="text-xs text-slate-500 dark:text-slate-400">
        到達度診断テストの結果画面に出す、段階の名前・一言と、下の購入カードを設定します（全紋章共通）。紋章ごとのフィードバック文は「到達度診断テスト管理」の各紋章の画面で編集します。
        <template v-if="isNew">まだ保存されていないため、初期値を表示しています。</template>
      </span>
    </div>

    <div v-if="loadError" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      {{ loadError }}
    </div>
    <template v-else-if="loading" />

    <div v-else class="space-y-4">
      <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="text-sm font-bold">段階</p>
        <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">結果画面の左下に4段階を並べ、合計点で当てはまる段階を強調して、その段階の一言を添えます。区切り（71／51／31％）は固定です。</p>
        <div class="space-y-4">
          <div v-for="(b, i) in settings.bands" :key="i" class="grid gap-2 lg:grid-cols-[7em_1fr]">
            <span class="pt-2 text-[12px] font-bold tabular-nums text-brass-700 dark:text-gold-300">{{ TEST_BAND_RANGE[i] }}</span>
            <div class="grid gap-2">
              <label class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">名前</span>
                <input v-model="b.label" type="text" :class="inputClass" />
              </label>
              <label class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">一言（この段階の人にだけ表示）</span>
                <textarea v-model="b.message" rows="2" :class="inputClass"></textarea>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="text-sm font-bold">購入カード</p>
        <p class="mb-4 text-xs text-slate-500 dark:text-slate-400">結果画面のいちばん下に3枚並べます。リンクは別タブで開きます。リンクが空のカードはボタンを出しません。</p>
        <div class="grid gap-4 lg:grid-cols-3">
          <div v-for="(p, i) in settings.products" :key="p.key" class="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <span class="text-[11px] text-slate-400">カード{{ i + 1 }}</span>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">商品名</span>
              <input v-model="p.name" type="text" :class="inputClass" />
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">価格（税込・円、空欄なら表示しない）</span>
              <input v-model="priceInputs[i]" type="text" inputmode="numeric" placeholder="5400" :class="inputClass" />
              <span class="text-[11px] text-slate-400">表示：{{ pricePreview(i) }}</span>
            </label>
            <label class="flex flex-col gap-1">
              <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">リンク（購入ページのURL）</span>
              <input v-model="p.url" type="url" placeholder="https://" :class="inputClass" />
            </label>
            <label class="flex items-center gap-2 text-[13px]">
              <input v-model="p.comingSoon" type="checkbox" class="h-4 w-4" />
              Coming soon として表示する（リンク・価格は出さない）
            </label>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-4 sm:p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <div v-if="saveError" class="mb-3 text-xs font-semibold text-red-600 dark:text-red-400">{{ saveError }}</div>
        <div v-if="saved" class="mb-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">保存しました。</div>
        <div class="flex justify-end">
          <button class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存する' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
