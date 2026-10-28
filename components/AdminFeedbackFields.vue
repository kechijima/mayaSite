<script setup lang="ts">
import { TEST_CATEGORY_KEYS } from '~/utils/achievementTest'
import { TEST_BAND_RANGE, TEST_CATEGORY_LABEL, type FeedbackTexts } from '~/utils/achievementTestFeedback'

// 1紋章ぶんのフィードバック文(5カテゴリ × 4段階)の入力欄。読み込み・保存は呼び出し側。
// /admin/tests の「結果表示 › 紋章ごと」(2ペイン)と /admin/tests/[sealIndex] の「結果表示」タブで共用。
defineProps<{ feedback: FeedbackTexts }>()
</script>

<template>
  <div class="space-y-5">
    <div v-for="key in TEST_CATEGORY_KEYS" :key="key">
      <p class="mb-2 text-[13px] font-bold text-brass-700 dark:text-gold-300">{{ TEST_CATEGORY_LABEL[key] }}</p>
      <div class="grid gap-2 xl:grid-cols-2">
        <label v-for="(range, bi) in TEST_BAND_RANGE" :key="range" class="flex flex-col gap-1">
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{{ range }}</span>
          <textarea
            v-model="feedback[key][bi]"
            rows="4"
            class="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[13px] leading-relaxed dark:border-slate-800 dark:bg-slate-900"
          ></textarea>
        </label>
      </div>
    </div>
  </div>
</template>
