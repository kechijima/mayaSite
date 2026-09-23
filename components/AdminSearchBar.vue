<script setup lang="ts">
// 管理画面の一覧ページ共通の検索バー。名前(キーワード)の入力欄と「詳細検索」アイコンだけを
// スクロール時に固定し、それ以外の絞り込み条件はアイコンから開くモーダルに置く。
// 条件が複数並ぶ行をそのまま固定すると、スマホでは画面の上半分が検索で埋まって一覧が見づらい
// ため(2026-09-23 の要望)。
//
// - v-model はキーワード。絞り込み条件はスロットの中でページ側の状態に直接 v-model する
//   (モーダルを閉じなくてもその場で一覧に反映される)。
// - activeFilters は「初期値から変えてある条件の数」。アイコンにバッジで出し、リセットの表示にも使う。
// - 固定は position:sticky。paper-theme.css の html,body{overflow-x:hidden} を管理画面だけ clip に
//   している前提(layouts/admin.vue 参照)。-mt-3/mb-1 + py-3 で、固定していないときの位置は
//   従来の「入力欄 + mb-4」と同じになる。
const props = withDefaults(
  defineProps<{
    modelValue: string
    placeholder?: string
    activeFilters?: number
    title?: string
  }>(),
  { placeholder: '名前で検索', activeFilters: 0, title: '詳細検索' }
)
const emit = defineEmits<{ 'update:modelValue': [value: string]; reset: [] }>()

const open = ref(false)
const panelEl = ref<HTMLElement | null>(null)
const triggerEl = ref<HTMLButtonElement | null>(null)

function close() {
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) nextTick(() => panelEl.value?.querySelector<HTMLElement>('input, select, button')?.focus())
  else triggerEl.value?.focus()
})

function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') close()
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const badgeLabel = computed(() =>
  props.activeFilters > 0 ? `詳細検索（${props.activeFilters}件の条件を設定中）` : '詳細検索'
)
</script>

<template>
  <div class="sticky top-14 z-20 -mx-4 -mt-3 mb-1 flex gap-2 bg-[#f4f5f3] px-4 py-3 md:top-0 md:-mx-8 md:px-8 dark:bg-[#0e1512]">
    <div class="relative min-w-0 flex-1">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="2" /><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        class="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-800 dark:bg-slate-900"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <button
      ref="triggerEl"
      type="button"
      class="relative flex h-[38px] w-[38px] flex-none items-center justify-center rounded-lg border bg-white text-slate-500 hover:border-slate-300 hover:text-brass-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-gold-300"
      :class="activeFilters > 0 ? 'border-brass-700 text-brass-700 dark:border-gold-300 dark:text-gold-300' : 'border-slate-200 dark:border-slate-800'"
      :aria-label="badgeLabel"
      :title="badgeLabel"
      :aria-expanded="open"
      @click="open = true"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <path d="M4 7h16M7 12h10M10 17h4" />
      </svg>
      <span
        v-if="activeFilters > 0"
        class="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brass-700 px-1 text-[10px] font-bold text-white dark:bg-gold-300 dark:text-[#1a1208]"
      >{{ activeFilters }}</span>
    </button>

    <!-- 条件モーダル。他の管理画面モーダルと同じ見た目(fixed + 中央寄せ + max-h で縦スクロール)。
         外側の sticky バーは z-20 の stacking context を作るので、その中に置くと z-50 でも
         トップバー(z-50)やドロワーのスクリム(z-30)の下に潜る。body へ Teleport して外に出す。 -->
    <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="close">
      <div
        ref="panelEl"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="max-h-[calc(100vh-2rem)] w-full max-w-[440px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="mb-4 flex items-start justify-between">
          <h2 class="text-base font-bold">{{ title }}</h2>
          <button type="button" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="閉じる" @click="close">✕</button>
        </div>

        <div class="space-y-4">
          <slot />
        </div>

        <div class="mt-5 flex items-center justify-between gap-2">
          <button
            v-if="activeFilters > 0"
            type="button"
            class="text-xs font-semibold text-slate-500 hover:underline dark:text-slate-400"
            @click="emit('reset')"
          >
            条件をリセット
          </button>
          <span v-else />
          <button type="button" class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white" @click="close">閉じる</button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>
