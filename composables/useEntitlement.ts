import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore'

// 有料エリアの閲覧可否。pages/result.vue・pages/kin/[sealIndex].vue・
// pages/kin/[kin]/detail.vue・composables/useDiagnosisContent.ts が使う。
//
// 判定は firestore.rules の isEntitledFor(docId) と対:
//   利用停止でない かつ (有料会員 plan == 'paid' または チーム所属 または その docId が単体購入で解放済み)
//
// 2026-09-23: それまでの「会員登録していて停止でなければ全員閲覧可」から、決済フローの導入に
// 合わせて上の条件に限定した。無料会員は LockedVeil を見る。plan / unlocks を書くのは本来
// サーバー(Stripe の Webhook)だが、決済モック期間は仮の決済画面が本人の権限で書く
// (utils/checkout.ts の applyMockPurchase)。
//
// 判定には users/{uid} と users/{uid}/unlocks を読む必要があるため、useAuth() の ready
// (Firebase Authの初期セッション復元が終わったか)だけでは足りない。settled が
// 両方の完了を表す — 詳細は下記。

export interface EntitlementProfile {
  // 診断フォームの入力内容。コード登録後に本人の診断結果ページへ戻すために使う
  // (pages/account.vue) — LockedVeil経由でない場合、戻り先のクエリが他に無いため。
  name?: string
  birthdate?: string
  gender?: string
  // 所属チーム。所属中はチーム会員として扱われ、すべての有料本文を読める(utils/userAdmin.ts)。
  teamId: string | null
  // 所属チーム名。referralTeams は管理者専用で、管理者に追加されたメンバーはコードも
  // 知らないため、非正規化しないと本人が自分の所属チーム名に到達できない(/accountの表示用)。
  teamName: string | null
  entitlementSource: 'code' | 'admin' | null
  referralCodeId: string | null
  // 最後にチームへ所属した日時。外れても消さないので「一度でも所属したことがあるか」が
  // 分かる — /account が案内文を「登録」と「再登録」で出し分けるのに使っている
  // (閲覧できるかどうかの判定には使わない。それは entitlement / teamId 側)。
  referralRedeemedAt: unknown | null
  // 会員ステータスの正。'paid' なら有料会員としてすべての有料本文を読める。
  plan: 'free' | 'paid'
  // 有料会員になった日時(決済モックでは仮の決済画面が書く)。
  paidAt?: unknown
  // 利用停止。true の間だけ有料エリアが閲覧できなくなる。無料部分は使える。
  // 変更できるのは管理者のみで、本人は解除できない(firestore.rules)。
  suspended?: boolean
}

// users/{uid}/unlocks/{contentDocId}。単体購入(KIN N の記事)で解放されたドキュメント 1 件ぶん。
export interface UnlockDoc {
  kin: number
  purchasedAt: unknown
}

interface EntitlementData {
  profile: EntitlementProfile | null
  // 解放済みの diagnosisContentPremium ドキュメントID → 購入した KIN
  unlocks: Record<string, number>
}

export function useEntitlement() {
  const { user, ready } = useAuth()
  const { $firestore } = useNuxtApp()

  const { data, pending, refresh } = useAsyncData<EntitlementData>(
    'entitlement',
    async () => {
      if (!user.value) return { profile: null, unlocks: {} }
      const firestore = $firestore as Firestore
      const [snap, unlockSnap] = await Promise.all([
        getDoc(doc(firestore, 'users', user.value.uid)),
        getDocs(collection(firestore, 'users', user.value.uid, 'unlocks'))
      ])
      const unlocks: Record<string, number> = {}
      unlockSnap.forEach((d) => {
        unlocks[d.id] = (d.data() as UnlockDoc).kin
      })
      return { profile: snap.exists() ? (snap.data() as EntitlementProfile) : null, unlocks }
    },
    { server: false, lazy: true, watch: [user] }
  )

  const profile = computed(() => data.value?.profile ?? null)
  const unlocks = computed(() => data.value?.unlocks ?? {})
  const suspended = computed(() => profile.value?.suspended === true)
  // 有料会員またはチーム会員(利用停止でない)。ページ全体の解放条件で、単体購入は含まない。
  const entitled = computed(
    () => !!profile.value && !suspended.value && (profile.value.plan === 'paid' || !!profile.value.teamId)
  )

  return {
    entitled,
    // 特定の有料ドキュメントを読めるか。firestore.rules の isEntitledFor(docId) と同じ条件。
    // 未確定(settled === false)の間は false — 判定が固まる前に有料本文が一瞬見えることはない。
    canRead: (docId: string) => entitled.value || (!suspended.value && docId in unlocks.value),
    // canRead の結果が変わりうるタイミングを watch するためのキー(useAsyncData の watch 用)。
    unlockKey: computed(() => `${entitled.value ? 'all' : ''}|${Object.keys(unlocks.value).sort().join(',')}`),
    // 単体購入済みの KIN(重複なし、昇順)。/account と /checkout が使う。
    purchasedKins: computed(() => [...new Set(Object.values(unlocks.value))].sort((a, b) => a - b)),
    // 利用停止中かどうか。/account が「ご利用いただけません」を出し分けるのに使う。
    suspended,
    // 認証の復元とusers/unlocksの取得が両方終わったか。呼び出し側はこれが
    // true になるまで「解放」も「ロック」も出さない — ready(認証のみ)で判断すると、
    // 閲覧できる会員にも profile 取得中の一瞬だけ有料エリアの訴求が出てしまうため。
    settled: computed(() => ready.value && !pending.value),
    teamId: computed(() => profile.value?.teamId ?? null),
    profile,
    // /account でコードを登録した直後や、仮の決済の直後に、再読み込みなしで解放を反映させる。
    refresh
  }
}
