<script setup lang="ts">
import { DEFAULT_GENDER, GENDER_OPTIONS, type Gender } from '~/utils/gender'

const name = ref('')
const birthdate = ref('')
const gender = ref<Gender>(DEFAULT_GENDER)
const router = useRouter()
const { recordSingleDiagnosis } = useDiagnosisHistory()

function submit() {
  recordSingleDiagnosis({ name: name.value, birthdate: birthdate.value, gender: gender.value })
  router.push({ path: '/result', query: { name: name.value || undefined, birth: birthdate.value || undefined, gender: gender.value } })
}
</script>

<template>
  <div class="paper-page min-h-screen">
    <div class="sheet" style="max-width: 560px; padding-top: clamp(56px, 12vw, 96px);">
      <div class="masthead" style="padding: 0 0 4px;">
        <span class="masthead__eyebrow">Maya Sacred Calendar</span>
        <h1 class="font-display masthead__title">マヤ暦占い</h1>
        <p class="masthead__sub">古代マヤの神聖暦「ツォルキン」が、あなたの生年月日から本質と運勢を読み解きます。</p>
      </div>

      <form class="mt-8 space-y-3.5 rounded-xl p-6" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">お名前</label>
          <input
            v-model="name"
            type="text"
            placeholder="結衣"
            class="w-full rounded px-3.5 py-2.5 text-sm outline-none"
            style="border: 1px solid var(--gold-line); background: var(--paper); color: var(--ink);"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">生年月日</label>
          <BirthdateSelect v-model="birthdate" theme="paper" />
        </div>
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">性別</label>
          <select
            v-model="gender"
            class="w-full rounded px-3.5 py-2.5 text-sm outline-none"
            style="border: 1px solid var(--gold-line); background: var(--paper); color: var(--ink);"
          >
            <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <button
          type="submit"
          class="w-full rounded-full py-3.5 text-[14.5px] font-bold tracking-[.03em]"
          style="background: var(--gold); color: #241a06;"
        >
          無料で診断する
        </button>
      </form>

      <p class="mt-6 text-center text-[12px]" style="color: var(--ink-faint);">
        まずは無料診断で、あなたの太陽の紋章とウェイブスペルをご覧いただけます。
      </p>
    </div>
  </div>
</template>
