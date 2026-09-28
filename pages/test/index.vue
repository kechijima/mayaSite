<script setup lang="ts">
import type { Firestore } from 'firebase/firestore'
import {
  QUESTIONS_PER_TEST,
  TEST_LEVELS,
  TEST_LEVEL_DESCRIPTION,
  TEST_LEVEL_LABEL,
  TEST_LEVEL_TITLE
} from '~/utils/achievementTest'
import { fetchTestResults, formatTestDateTime, summarizeByLevel } from '~/utils/achievementTestResults'

// 到達度テストの入口。級ごとの説明と、本人のこれまでの結果(回数・最高点・合格したか)を出す。
// 受けられるのはチーム会員だけ(composables/useTestAccess.ts)。順序も回数も縛らない。
const { access, user, loginLink, accountLink } = useTestAccess()

const { data: results, pending: loadingResults } = useAsyncData(
  'test-results-self',
  async () => {
    if (access.value !== 'ok' || !user.value) return []
    const { $firestore } = useNuxtApp()
    return fetchTestResults($firestore as Firestore, user.value.uid)
  },
  { server: false, lazy: true, watch: [access] }
)
const summary = computed(() => summarizeByLevel(results.value ?? []))
</script>

<template>
  <div class="paper-page paper-page--focus">
    <IconSprite />
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">ACHIEVEMENT TEST</span>
        <h1 class="font-display masthead__title">到達度テスト</h1>
        <p class="masthead__sub">マヤ暦の基礎がどこまで身についたか、{{ QUESTIONS_PER_TEST }}問の4択で確かめます。</p>
      </div>

      <div class="mx-auto mt-10 max-w-[560px] space-y-4">
        <TestAccessNotice :access="access" :login-link="loginLink" :account-link="accountLink" />

        <template v-if="access === 'ok'">
          <section v-for="level in TEST_LEVELS" :key="level" class="panel testlevel">
            <div class="testlevel__head">
              <span class="testlevel__grade">{{ TEST_LEVEL_LABEL[level] }}</span>
              <h2 class="testlevel__title">{{ TEST_LEVEL_TITLE[level] }}</h2>
              <span v-if="summary[level].passed" class="testlevel__pass">合格済み</span>
            </div>
            <p class="testlevel__desc">{{ TEST_LEVEL_DESCRIPTION[level] }}</p>
            <p class="testlevel__stats">
              <template v-if="loadingResults">読み込み中…</template>
              <template v-else-if="summary[level].attempts === 0">まだ受けていません</template>
              <template v-else>
                受験 {{ summary[level].attempts }}回 ／ 最高 {{ summary[level].best }}／{{ summary[level].total }}点 ／ 最終 {{ formatTestDateTime(summary[level].lastAt) }}
              </template>
            </p>
            <NuxtLink :to="`/test/${level}`" class="btn-gold w-full sm:w-auto">
              {{ summary[level].attempts ? 'もう一度受ける' : '受ける' }}
            </NuxtLink>
          </section>
        </template>

        <NuxtLink to="/account" class="!mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          マイページへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
