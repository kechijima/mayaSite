<script setup lang="ts">
import { DEFAULT_BIRTHDATE_YEAR, DEFAULT_BIRTHDATE_MONTH, DEFAULT_BIRTHDATE_DAY } from '~/utils/birthdate'

// Renders 生年月日 as three native <select>s (年/月/日) instead of <input type="date"> —
// native selects render as a drum-roll/wheel picker on iOS and a scrollable list on Android,
// which is far easier to operate than a native date-input's calendar widget on mobile.
const props = withDefaults(defineProps<{ modelValue: string; theme?: 'ink' | 'paper' }>(), { theme: 'ink' })
const emit = defineEmits<{ 'update:modelValue': [string] }>()

// 'ink' (default) keeps today's exact dark gold-on-black styling for pages/index.vue, which
// doesn't pass this prop at all — zero visual change there. 'paper' is the new parchment theme,
// used only by pages/compatibility.vue.
const selectClass = computed(() =>
  props.theme === 'paper'
    ? 'w-full rounded border px-2 py-2.5 text-sm outline-none transition-colors'
    : 'w-full rounded border border-gold-500/30 bg-transparent px-2 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]'
)
const selectStyle = computed(() =>
  props.theme === 'paper'
    ? { borderColor: 'var(--gold-line)', background: 'var(--paper-panel)', color: 'var(--ink)' }
    : {}
)
const optionClass = computed(() => (props.theme === 'paper' ? '' : 'bg-ink-950'))

const MIN_YEAR = 1900
const MAX_YEAR = 2050

// 元号は年単位の簡易換算(改元月日は無視し、その年の大半を占める元号を採用する一般的な方式)。
// 対象範囲(1900〜2050年)は明治〜令和のみで収まる。
function wareki(year: number): string {
  if (year >= 2019) return `令和${year === 2019 ? '元' : year - 2018}年`
  if (year >= 1989) return `平成${year === 1989 ? '元' : year - 1988}年`
  if (year >= 1926) return `昭和${year === 1926 ? '元' : year - 1925}年`
  if (year >= 1912) return `大正${year === 1912 ? '元' : year - 1911}年`
  return `明治${year === 1868 ? '元' : year - 1867}年`
}
// 既定値は utils/birthdate.ts と共有 — pages/compatibility.vue が「既定値のままか＝未入力か」を
// 判定するのに同じ値を必要とするため、こちらで直書きしない。
const DEFAULT_YEAR = DEFAULT_BIRTHDATE_YEAR
const DEFAULT_MONTH = DEFAULT_BIRTHDATE_MONTH
const DEFAULT_DAY = DEFAULT_BIRTHDATE_DAY

function parse(v: string): [string, string, string] {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '')
  // Options use unpadded month/day values ("3", not "03"), so strip leading zeros here or an
  // ISO-formatted initial value (e.g. from a query param) won't match any <option>.
  return m ? [m[1], String(Number(m[2])), String(Number(m[3]))] : ['', '', '']
}

const [initYear, initMonth, initDay] = parse(props.modelValue)
// Default to 1985/01/01 rather than a blank placeholder when no value is passed in — avoids
// making every visitor scroll a drum-roll picker from empty, and the immediate watcher below
// emits this default back to the parent right away so v-model never silently disagrees with
// what's shown on screen. 1985 is roughly the middle of the expected visitor age range, so
// it's the shortest average scroll in either direction.
const year = ref(initYear || DEFAULT_YEAR)
const month = ref(initMonth || DEFAULT_MONTH)
const day = ref(initDay || DEFAULT_DAY)

// Newest-first (2050 → 1900): scrolling up goes into the future, down goes into the past
// (2026-08-24のユーザー指示で、月/日とは逆向きのこちらへ再度変更)。
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
    <select v-model="year" required :class="selectClass" :style="selectStyle">
      <option value="" disabled :class="optionClass">年</option>
      <option v-for="y in years" :key="y" :value="y" :class="optionClass">{{ y }}年（{{ wareki(Number(y)) }}）</option>
    </select>
    <select v-model="month" required :class="selectClass" :style="selectStyle">
      <option value="" disabled :class="optionClass">月</option>
      <option v-for="m in months" :key="m" :value="m" :class="optionClass">{{ m }}月</option>
    </select>
    <select v-model="day" required :class="selectClass" :style="selectStyle">
      <option value="" disabled :class="optionClass">日</option>
      <option v-for="d in days" :key="d" :value="d" :class="optionClass">{{ d }}日</option>
    </select>
  </div>
</template>
