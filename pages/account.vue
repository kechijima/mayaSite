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

const submittingCode = ref(false)
const codeError = ref('')

// LockedVeilの「続きを購入する」から来た場合、コード登録後に読んでいたページへ戻す
// (composables/useUnlockLink.ts)。検証は/signup・/loginと同じ — 外部サイトへ飛ばされ
// ないよう、"/"で始まり"//"で始まらないものだけを受け付ける。
const route = useRoute()
const redirectTarget = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
})
// 未ログインでこの画面に来た場合のログイン導線。戻り先(このページ+redirect)を保つ。
const loginLink = computed(() =>
  `/login?redirect=${encodeURIComponent(redirectTarget.value ? `/account?redirect=${encodeURIComponent(redirectTarget.value)}` : '/account')}`
)

// 3状態: 未所属(入力できる) / 所属中(表示のみ) / 除外済み(入力できない)。
// 除外済みで入力欄を出さないのは、Firestoreのルールが「一度も所属したことがない人」
// しか受け付けないため — 出しても必ず失敗する(firestore.rules の update 3本目)。
const membership = computed(() => {
  if (!profile.value) return 'unknown'
  if (profile.value.teamId) return 'joined'
  return profile.value.referralRedeemedAt ? 'removed' : 'unaffiliated'
})

async function submitCode() {
  codeError.value = ''
  if (!user.value) return
  submittingCode.value = true
  try {
    if (!(await referral.validate())) return
    const { $firestore } = useNuxtApp()
    await updateDoc(doc($firestore as Firestore, 'users', user.value.uid), referral.redemptionFields())
    // 再読み込みなしで有料エリアの解放を反映させる。
    await refreshEntitlement()
    referral.input.value = ''
    referral.reset()
    // 有料エリアから来ていれば、解放された状態でその続きへ戻す。
    if (redirectTarget.value) await navigateTo(redirectTarget.value)
  } catch (err) {
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
          <p v-if="redirectTarget && membership !== 'joined'" class="mb-3.5 rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.8]" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
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

          <!-- 除外済み: ルール上、本人による再登録は受け付けられない -->
          <template v-else-if="membership === 'removed'">
            <p class="mb-2 text-[14.5px]">現在どのチームにも所属していません。</p>
            <p class="text-[12.5px]" style="color: var(--ink-faint);">
              有料エリアのご利用をご希望の場合は、お手数ですがお問い合わせください。
            </p>
          </template>

          <!-- 未所属: 後追いで入力できる -->
          <template v-else-if="membership === 'unaffiliated'">
            <p class="mb-3.5 text-[13.5px] leading-[1.9]" style="color: var(--ink-soft);">
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
                @blur="referral.validate()"
              />
              <p
                v-if="referral.message.value"
                class="text-[12.5px]"
                :style="{ color: referral.isValid.value ? 'var(--gold-deep)' : 'var(--seal-red)' }"
              >{{ referral.message.value }}</p>
              <p v-if="codeError" class="text-[12.5px]" style="color: var(--seal-red);">{{ codeError }}</p>
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
