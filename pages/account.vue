<script setup lang="ts">
import { doc, updateDoc, type Firestore } from 'firebase/firestore'

// 2026-09-07: 契約状況・解約のモック(useMembershipのlocalStorageフラグを使った
// プラン表示・解約フロー)を全て削除し、紹介コードの入力専用ページにした。
// 決済が未実装で「ご契約中のプラン」「次回請求日」「お支払い方法」はいずれも
// 固定のダミー値であり、実データである紹介コードと並べると利用者が混乱するため。
// 決済を導入する際は改めて設計する(useMembershipは/checkoutのモックにまだ残っている)。
const { user, ready: authReady } = useAuth()
const { profile, settled, refresh: refreshEntitlement } = useEntitlement()
const referral = useReferralCodeInput()
const { withLoading } = useGlobalLoading()

const submittingCode = ref(false)
const codeError = ref('')

// LockedVeilの「続きを購入する」から来た場合、コード登録後に読んでいたページへ戻す
// (composables/useUnlockLink.ts)。検証は/signup・/loginと同じ — 外部サイトへ飛ばされ
// ないよう、"/"で始まり"//"で始まらないものだけを受け付ける。
const route = useRoute()
// LockedVeil から来た場合の戻り先。
const requestedRedirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
})
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

// 2状態: 所属中(表示のみ) / 未所属(入力できる)。
// 管理者に外された人も「未所属」に含める — 以前は入力させない扱いだったが、
// 入り直せないのは不便という判断で、今はルール側も「今どこにも所属していない人」なら
// 受け付ける(firestore.rules の update 3本目)。
const membership = computed(() => {
  if (!profile.value) return 'unknown'
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
  <div class="paper-page min-h-screen">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">MY ACCOUNT</span>
        <h1 class="font-display masthead__title">紹介コード入力</h1>
      </div>

      <div class="mx-auto max-w-[560px]">
        <section class="panel">
          <!-- 有料エリアの「続きを購入する」から来た場合。なぜこの画面にいるのかを明示する。 -->
          <p v-if="requestedRedirect && membership !== 'joined'" class="mb-3.5 rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.8]" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
            続きをご覧いただくには、紹介コードのご登録が必要です。
          </p>

          <p v-if="!authReady" class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>

          <template v-else-if="!user">
            <p class="mb-4 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              紹介コードのご登録にはログインが必要です。
            </p>
            <NuxtLink :to="loginLink" class="btn-gold">ログインする</NuxtLink>
          </template>

          <p v-else-if="!settled" class="text-[13.5px]" style="color: var(--ink-faint);">読み込み中…</p>

          <!-- 所属中: コード文字列そのものは表示しない(管理者のみが閲覧できる情報) -->
          <template v-else-if="membership === 'joined'">
            <p class="mb-2 text-[14.5px]">
              <span style="color: var(--gold-deep);">✓</span>
              {{ profile?.teamName || 'チーム' }}に所属しています
            </p>
            <p class="text-[12.5px]" style="color: var(--ink-faint);">
              有料エリアをご覧いただけます。変更をご希望の場合はお問い合わせください。
            </p>
          </template>

          <!-- 未所属: 一度も所属していない人も、管理者に外された人も、ここで入力できる -->
          <template v-else-if="membership === 'unaffiliated'">
            <p v-if="hasJoinedBefore" class="mb-3.5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              現在どのチームにも所属していません。紹介コードをご登録いただくと、再び有料エリアをご覧いただけます。
            </p>
            <p v-else class="mb-3.5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
              紹介コードをご登録いただくと、有料エリアをご覧いただけます。
            </p>
            <form class="space-y-3" @submit.prevent="submitCode">
              <input
                v-model="referral.input.value"
                type="text"
                inputmode="latin"
                autocapitalize="characters"
                autocomplete="off"
                placeholder="K7M3QP9XR"
                class="formfield"
                style="text-transform: uppercase;"
                @blur="withLoading(() => referral.validate())"
              />
              <!-- 照合メッセージとエラーを1つの枠にまとめ、空でも1行分の高さを確保する。
                   メッセージの出現でボタンが下へずれると、押した瞬間にクリックが外れる。 -->
              <p
                class="min-h-[1.5em] text-[12.5px] leading-[1.5]"
                :style="{ color: codeError || !referral.isValid.value ? 'var(--seal-red)' : 'var(--gold-deep)' }"
              >{{ codeError || referral.message.value }}</p>
              <!-- 入力欄との間を広めに取る。form全体のspace-y-3だと照合メッセージとの間隔まで
                   広がってしまうので、ボタンだけ!mt-で上書きする(pages/index.vueと同じ手法)。 -->
              <button type="submit" class="btn-gold !mt-7 w-full" :disabled="submittingCode || !referral.code.value">
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
