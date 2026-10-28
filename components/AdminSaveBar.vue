<script setup lang="ts">
// 管理画面の編集フォームの保存バー。長いフォームの途中でも押せるよう、画面の下に貼り付ける。
// 状態(未保存 / 保存しました / エラー)と「元に戻す」「保存する」。
defineProps<{ dirty: boolean; saving: boolean; error: string; saved: boolean }>()
defineEmits<{ reset: []; save: [] }>()
</script>

<template>
  <div class="sticky bottom-0 z-10 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5.5 dark:border-slate-800 dark:bg-slate-900/95">
    <div class="flex flex-wrap items-center gap-3">
      <span v-if="error" class="text-xs font-semibold text-red-600 dark:text-red-400">{{ error }}</span>
      <span v-else-if="dirty" class="text-xs font-semibold text-amber-600 dark:text-amber-400">未保存の変更があります</span>
      <span v-else-if="saved" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">保存しました。</span>
      <span v-else class="hidden text-[12px] text-slate-500 sm:inline dark:text-slate-400"><slot /></span>
      <div class="ml-auto flex gap-2">
        <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700" :disabled="!dirty || saving" @click="$emit('reset')">元に戻す</button>
        <button type="button" class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60" :disabled="!dirty || saving" @click="$emit('save')">
          {{ saving ? '保存中…' : '保存する' }}
        </button>
      </div>
    </div>
  </div>
</template>
