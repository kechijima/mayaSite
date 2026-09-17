<script setup lang="ts">
import { doc, updateDoc, type Firestore } from 'firebase/firestore'
import { safeRedirect } from '~/utils/signupLink'

// 紹介コードの後追い入力ページ。既に会員登録済みの人がチームとコードを入力すると、
// そのチームに所属し有料会員(紹介)になる。新規登録と同時に入力する場合は pages/signup/referral.vue。
// 契約状況・解約の表示は決済導入時に改めて設計する。
const { user, ready: authReady } = useAuth()
const { profile, settled, suspended, refresh: refreshEntitlement } = useEntitlement()
const referral = useReferralCodeInput()
const { withLoading } = useGlobalLoading()

const submittingCode = ref(false)
const codeError = ref('')

// 読んでいたページから来た場合(/signup/referral のログイン導線など)、コード登録後にそこへ戻す。
// 検証は/signup・/loginと同じ(utils/signupLink.ts の safeRedirect)。
const route = useRoute()
const requestedRedirect = computed(() => safeRedirect(route.query.redirect))
// /account を直接開いた場合(ヘッダーやブックマークから)は redirect が無い。その場合でも
// 登録して終わりでは解放されたことが伝わらないので、本人の診断結果ページへ送る。
// 生年月日は会員登録時に必ず入れてもらっているので users ドキュメントから組み立てられる。
const ownResultPath = computed(() => {
  const p = profile.value
  if (!p?.birthdate) return '/'
  const params = new URLSearchParams({ birth: p.birthdate })
  if (p.name) params.set('name', p.name)
  if (p.gender) params.set('gender', p.gender)
  return `/result?${params.toString()}`
})
// 登録後の遷移先。必ずどこかへ移動させる — 画面に残したまま文言だけ変えても、
// 登録できたのか分かりにくいという指摘があったため(2026-09-07)。
const redirectTarget = computed(() => requestedRedirect.value ?? ownResultPath.value)
// 未ログインでこの画面に来た場合のログイン導線。戻り先(このページ+redirect)を保つ。
const loginLink = computed(() =>
  `/login?redirect=${encodeURIComponent(requestedRedirect.value ? `/account?redirect=${encodeURIComponent(requestedRedirect.value)}` : '/account')}`
)

// 3状態: 利用停止(入力できない) / 所属中(表示のみ) / 未所属(入力できる)。
// 利用停止はルール側でもコード登録を拒否するので、入力欄を出しても必ず失敗する。
// 管理者に外された人は「未所属」に含める — 入り直せないのは不便という判断で、
// ルール側も「今どこにも所属していない人」なら受け付ける(firestore.rules の update 3本目)。
const membership = computed(() => {
  if (!profile.value) return 'unknown'
  if (suspended.value) return 'suspended'
  return profile.value.teamId ? 'joined' : 'unaffiliated'
})
// 一度どこかに所属したことがあるか。文言を「登録」と「再登録」で出し分けるだけに使う。
const hasJoinedBefore = computed(() => !!profile.value?.referralRedeemedAt)

async function submitCode() {
  codeError.value = ''
  if (!user.value) return
  submittingCode.value = true
  try {
    // 照合・書き込み・権限の再取得・遷移の4回分の通信をまとめて覆う。
    await withLoading(async () => {
      if (!(await referral.validate())) return
      const { $firestore } = useNuxtApp()
      await updateDoc(doc($firestore as Firestore, 'users', user.value!.uid), referral.redemptionFields())
      // 解放を反映させてから遷移する。先に遷移すると、戻った先がまだロック状態のまま描画される。
      await refreshEntitlement()
      referral.input.value = ''
      referral.reset()
      // 解放された状態の画面へ送る。ここまで来たら必ず遷移する(redirectTargetは常に値を持つ)。
      await navigateTo(redirectTarget.value)
    })
  } catch (err) {
    // 照合メッセージ(「〇〇チームからのご紹介として登録します」)が残っていると、
    // 成功したのか失敗したのか読み取れないので消してからエラーを出す。
    referral.reset()
    codeError.value = (err as { code?: string })?.code === 'permission-denied'
      ? 'このコードは登録できませんでした。お手数ですがお問い合わせください。'
      : '登録に失敗しました。時間をおいて再度お試しください。'
  } finally {
    submittingCode.value = false
  }
}
</script>

<template>
  <!-- 2026-08-17: 黒地に金(bg-ink-950)の独自配色から、他のユーザー向けページと同じ
       paper(羊皮紙)配色へ統一。共通ヘッダー追加にあわせて、ヘッダーだけ浮いて見えないように。 -->
  <div class="paper-page paper-page--focus">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MY ACCOUNT</span>
        <h1 class="font-display masthead__title">紹介コード入力</h1>
      </div>

      <div class="mx-auto mt-5 max-w-[560px]">
        <section class="panel">
          <p v-if="!authReady" class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>

          <template v-else-if="!user">
            <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              紹介コードのご登録にはログインが必要です。
            </p>
            <NuxtLink :to="loginLink" class="btn-gold">ログインする</NuxtLink>
          </template>

          <p v-else-if="!settled" class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>

          <!-- 利用停止: ルール上、本人によるコード登録は受け付けられない -->
          <template v-else-if="membership === 'suspended'">
            <p class="mb-2 text-[14.5px]">現在このアカウントはご利用いただけません。</p>
            <p class="text-[12.5px]" style="color: var(--ink-faint);">
              お手数ですがお問い合わせください。
            </p>
          </template>

          <!-- 所属中: コード文字列そのものは表示しない(管理者のみが閲覧できる情報) -->
          <template v-else-if="membership === 'joined'">
            <p class="mb-2 text-[14.5px]">
              <span style="color: var(--gold-deep);">✓</span>
              {{ profile?.teamName || 'チーム' }}に所属しています
            </p>
            <p class="mb-2 text-[13px]" style="color: var(--ink-soft);">
              有料会員（紹介）として、すべての診断結果をご覧いただけます。
            </p>
            <p class="text-[12.5px]" style="color: var(--ink-faint);">
              変更をご希望の場合はお問い合わせください。
            </p>
          </template>

          <!-- 未所属: 一度も所属していない人も、管理者に外された人も、ここで入力できる -->
          <template v-else-if="membership === 'unaffiliated'">
            <p v-if="hasJoinedBefore" class="mb-3.5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              現在どのチームにも所属していません。紹介コードをお持ちの方はご登録ください。
            </p>
            <p v-else class="mb-3.5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              ご紹介いただいたチームと紹介コードをご登録いただくと、有料会員としてすべての診断結果をご覧いただけます。
            </p>
            <form class="space-y-3" @submit.prevent="submitCode">
              <!-- 照合メッセージとエラーは部品内の1つの枠にまとめ、空でも1行分の高さを確保している。 -->
              <ReferralCodeFields :referral="referral" :error="codeError" />
              <!-- 入力欄との間を広めに取る。form全体のspace-y-3だと照合メッセージとの間隔まで
                   広がってしまうので、ボタンだけ!mt-で上書きする(pages/index.vueと同じ手法)。 -->
              <button type="submit" class="btn-gold !mt-7 w-full" :disabled="submittingCode || !referral.selectedTeamId.value || !referral.code.value">
                {{ submittingCode ? '登録中…' : '登録する' }}
              </button>
            </form>
          </template>
        </section>

        <NuxtLink to="/" class="mt-4 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
