<script setup lang="ts">
import type { useReferralCodeInput } from '~/composables/useReferralCodeInput'

// 紹介コードの入力欄一式(チーム選択 + コード + 照合メッセージ)。
// pages/signup/referral.vue と pages/account.vue で共用する。照合ロジックと状態は
// 呼び出し側が持つ useReferralCodeInput() をそのまま受け取る — 送信時にも同じ状態を
// 使うため、部品の中で作ってしまうと呼び出し側から参照できなくなる。
const props = defineProps<{
  referral: ReturnType<typeof useReferralCodeInput>
  // 送信時のエラー。照合メッセージと同じ行に出す(行を増やすとボタン位置がずれるため)。
  error?: string
}>()

const { teams, pending, error: teamsError } = usePublicTeams()

// 入力途中の照合(blur・チーム変更時)は全画面ローディング(useGlobalLoading)で覆わず、
// メッセージ行の「確認しています…」だけで示す。覆うと、コード欄に入力したまま送信ボタンを
// 押したとき、blur で出た覆いが同じクリックを吸い込んで送信されない(覆いは pointer-events を
// 奪うため)。送信時の照合は呼び出し側が withLoading で包んでいる。
function validateQuietly() {
  props.referral.validate()
}

// チームを選び直したら、入力済みのコードをその組み合わせで照合し直す。
// 先にコードを入れてからチームを選ぶ順番でも、結果がすぐ分かるように。
watch(
  () => props.referral.selectedTeamId.value,
  () => {
    if (props.referral.code.value) validateQuietly()
  }
)
</script>

<template>
  <!-- /signup/referral では PC 幅でチームとコードを横に並べる(.signupform 内だけ2列。/account は1列のまま)。 -->
  <div class="formgrid">
    <div>
      <label class="formlabel" for="referral-team">チーム</label>
      <select
        id="referral-team"
        v-model="referral.selectedTeamId.value"
        class="formfield"
        required
        :disabled="pending"
      >
        <option value="" disabled>{{ pending ? '読み込み中…' : 'チームを選択してください' }}</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <p v-if="teamsError" class="mt-1.5 text-[12.5px]" style="color: var(--seal-red);">
        チーム一覧を読み込めませんでした。通信環境をご確認のうえ、再読み込みしてください。
      </p>
    </div>
    <div>
      <label class="formlabel" for="referral-code">紹介コード</label>
      <input
        id="referral-code"
        v-model="referral.input.value"
        type="text"
        inputmode="latin"
        autocapitalize="characters"
        autocomplete="off"
        placeholder="K7M3QP9XR"
        required
        class="formfield"
        style="text-transform: uppercase;"
        @blur="validateQuietly"
      />
      <!-- 常に1行分の高さを確保する。照合結果の出現でボタンが下へずれると、
           押した瞬間にクリックが外れることがあるため。 -->
      <p
        class="mt-1.5 min-h-[1.5em] text-[12.5px] leading-[1.5]"
        :style="{ color: error || !(referral.isValid.value || referral.state.value === 'checking') ? 'var(--seal-red)' : 'var(--gold-deep)' }"
      >{{ error || referral.message.value }}</p>
    </div>
  </div>
</template>
