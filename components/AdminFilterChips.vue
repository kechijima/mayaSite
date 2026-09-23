<script setup lang="ts">
// 詳細検索モーダルの中で使う「1つ選ぶ」条件。<select> より指で選びやすいチップ型のラジオ。
// 見た目は /admin/users の会員ステータス選択(users.vue)と揃えている。
defineProps<{
  modelValue: string
  label: string
  options: { value: string; label: string }[]
}>()
defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <fieldset>
    <legend class="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">{{ label }}</legend>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="cursor-pointer rounded-lg border px-3.5 py-2 text-sm font-semibold"
        :class="modelValue === opt.value
          ? 'border-brass-700 bg-amber-50 text-brass-700 dark:border-gold-300 dark:bg-amber-950/40 dark:text-gold-300'
          : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'"
      >
        <input
          type="radio"
          :value="opt.value"
          :checked="modelValue === opt.value"
          class="sr-only"
          @change="$emit('update:modelValue', opt.value)"
        />
        {{ opt.label }}
      </label>
    </div>
  </fieldset>
</template>
