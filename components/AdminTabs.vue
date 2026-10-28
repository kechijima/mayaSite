<script setup lang="ts">
// 管理画面のタブ。選んでいるタブは URL の ?tab= に持つ(再読み込み・リンクで同じタブが開く)。
// 先頭のタブは ?tab を付けない。
const props = defineProps<{ tabs: { key: string; label: string }[] }>()
const route = useRoute()
const router = useRouter()

const current = computed(() => {
  const q = typeof route.query.tab === 'string' ? route.query.tab : ''
  return props.tabs.some((t) => t.key === q) ? q : props.tabs[0].key
})

function select(key: string) {
  const query = { ...route.query }
  if (key === props.tabs[0].key) delete query.tab
  else query.tab = key
  router.replace({ query })
}

defineExpose({ current, select })
</script>

<template>
  <div role="tablist" class="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-800">
    <button
      v-for="t in tabs"
      :key="t.key"
      type="button"
      role="tab"
      :aria-selected="current === t.key"
      class="-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm font-semibold transition-colors"
      :class="current === t.key
        ? 'border-brass-700 text-brass-700 dark:border-gold-300 dark:text-gold-300'
        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'"
      @click="select(t.key)"
    >{{ t.label }}</button>
  </div>
</template>
