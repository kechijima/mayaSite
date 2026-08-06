<script setup lang="ts">
// Renders 生年月日 as three native <select>s (年/月/日) instead of <input type="date"> —
// native selects render as a drum-roll/wheel picker on iOS and a scrollable list on Android,
// which is far easier to operate than a native date-input's calendar widget on mobile.
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const MIN_YEAR = 1900
const MAX_YEAR = 2050
const DEFAULT_YEAR = '2000'
const DEFAULT_MONTH = '1'
const DEFAULT_DAY = '1'

function parse(v: string): [string, string, string] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  // Options use unpadded month/day values ("3", not "03"), so strip leading zeros here or an
  // ISO-formatted initial value (e.g. from a query param) won't match any <option>.
  return m ? [m[1], String(Number(m[2])), String(Number(m[3]))] : ['', '', '']
}

const [initYear, initMonth, initDay] = parse(props.modelValue)
// Default to 2000/01/01 rather than a blank placeholder when no value is passed in — avoids
// making every visitor scroll a drum-roll picker from empty, and the immediate watcher below
// emits this default back to the parent right away so v-model never silently disagrees with
// what's shown on screen.
const year = ref(initYear || DEFAULT_YEAR)
const month = ref(initMonth || DEFAULT_MONTH)
const day = ref(initDay || DEFAULT_DAY)

// Newest-first — matches the common Japanese birthdate-picker convention, and minimizes
// scrolling for the common case since most visitors were born in recent decades, not 1900.
const years = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => String(MAX_YEAR - i))
const months = Array.from({ length: 12 }, (_, i) => String(i + 1))

const days = computed(() => {
  const y = Number(year.value)
  const m = Number(month.value)
  const count = y && m ? new Date(y, m, 0).getDate() : 31
  return Array.from({ length: count }, (_, i) => String(i + 1))
})

watch([year, month], () => {
  if (day.value && Number(day.value) > days.value.length) day.value = ''
})

watch(
  [year, month, day],
  () => {
    emit('update:modelValue', year.value && month.value && day.value ? `${year.value}-${month.value.padStart(2, '0')}-${day.value.padStart(2, '0')}` : '')
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex gap-2">
    <select
      v-model="year"
      required
      class="w-full rounded border border-gold-500/30 bg-transparent px-2 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
    >
      <option value="" disabled class="bg-ink-950">年</option>
      <option v-for="y in years" :key="y" :value="y" class="bg-ink-950">{{ y }}年</option>
    </select>
    <select
      v-model="month"
      required
      class="w-full rounded border border-gold-500/30 bg-transparent px-2 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
    >
      <option value="" disabled class="bg-ink-950">月</option>
      <option v-for="m in months" :key="m" :value="m" class="bg-ink-950">{{ m }}月</option>
    </select>
    <select
      v-model="day"
      required
      class="w-full rounded border border-gold-500/30 bg-transparent px-2 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
    >
      <option value="" disabled class="bg-ink-950">日</option>
      <option v-for="d in days" :key="d" :value="d" class="bg-ink-950">{{ d }}日</option>
    </select>
  </div>
</template>
