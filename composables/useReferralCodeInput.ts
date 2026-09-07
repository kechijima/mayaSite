import { doc, getDoc, serverTimestamp, type Firestore } from 'firebase/firestore'
import { isCodeShaped, normalizeCode } from '~/utils/referralCode'

// 紹介コード入力欄の共通ロジック。pages/signup.vue(会員登録時)と pages/account.vue
// (後追い入力)が同じ挙動になるよう、照合と状態管理をここにまとめている。
//
// 照合は referralCodes/{コード} を1件 getDoc するだけ。コード文字列を知らなければ
// 引けず、一覧の列挙は管理者に限られている(firestore.rules 参照)ので、この照合を
// 公開しても全コードが漏れることはない。ただし照合はあくまで入力補助で、実際の
// 検証はFirestoreのルールが users への書き込み時にもう一度行う。

export type ReferralCodeState = 'empty' | 'checking' | 'valid' | 'invalid' | 'error'

export function useReferralCodeInput() {
  const { $firestore } = useNuxtApp()

  const input = ref('')
  const state = ref<ReferralCodeState>('empty')
  const teamId = ref('')
  const teamName = ref('')

  const code = computed(() => normalizeCode(input.value))
  const isValid = computed(() => state.value === 'valid')
  // 入力があるのに有効になっていない状態。送信ボタンを止める条件に使う
  // (空欄は任意入力なので止めない)。
  const blocksSubmit = computed(() => code.value.length > 0 && state.value !== 'valid')

  const message = computed(() => {
    switch (state.value) {
      case 'valid': return `${teamName.value}からのご紹介として登録します`
      case 'invalid': return 'このコードはご利用いただけません。お間違いがないかご確認ください'
      case 'error': return '確認できませんでした。通信環境をご確認のうえ、もう一度お試しください'
      default: return ''
    }
  })

  function reset() {
    state.value = 'empty'
    teamId.value = ''
    teamName.value = ''
  }

  // 入力の途中では照合しない — 1文字ごとにFirestoreを引くことになるうえ、打ち終わる
  // までは必ず「無効」と出て邪魔になるため、blur や送信時にまとめて確かめる。
  async function validate(): Promise<boolean> {
    const normalized = code.value
    if (!normalized) {
      reset()
      return false
    }
    // 長さも文字種も合わないものは存在し得ないので、Firestoreを引かずにその場で弾く。
    if (!isCodeShaped(normalized)) {
      state.value = 'invalid'
      teamId.value = ''
      teamName.value = ''
      return false
    }

    state.value = 'checking'
    try {
      const snap = await getDoc(doc($firestore as Firestore, 'referralCodes', normalized))
      const data = snap.exists()
        ? (snap.data() as { teamId?: string; teamName?: string; status?: string })
        : null
      if (data?.status === 'active' && data.teamId) {
        teamId.value = data.teamId
        teamName.value = data.teamName ?? ''
        state.value = 'valid'
        return true
      }
      // 存在しない場合と無効化されている場合を区別せず同じ文言にしている。
      // 「そのコードは存在するが無効」と伝えると、総当たりの当たり判定に使えてしまうため。
      teamId.value = ''
      teamName.value = ''
      state.value = 'invalid'
      return false
    } catch {
      // 通信エラーを「無効なコード」と表示すると、正しいコードを持つ人が諦めてしまう。
      teamId.value = ''
      teamName.value = ''
      state.value = 'error'
      return false
    }
  }

  // users ドキュメントに書き込む権限系フィールド。Firestoreのルールはこの5項目が
  // 揃っていること、かつ teamId/teamName がコードのドキュメントと一致することを
  // 要求する(firestore.rules の redeemsCode)。
  function redemptionFields() {
    return {
      teamId: teamId.value,
      teamName: teamName.value,
      entitlement: 'code' as const,
      entitlementSource: 'code' as const,
      referralCodeId: code.value,
      referralRedeemedAt: serverTimestamp()
    }
  }

  return { input, code, state, teamId, teamName, isValid, blocksSubmit, message, validate, reset, redemptionFields }
}

// コード未入力で会員登録する場合に書き込む初期値。フィールドを省略せず明示的に
// null を入れるのは、後から /account でコードを入れるときのルール判定が
// resource.data.referralRedeemedAt を参照するため — フィールドが無いとその参照が
// エラーになり、正当な解放まで弾かれてしまう。
export function unaffiliatedFields() {
  return {
    teamId: null,
    teamName: null,
    entitlement: 'none' as const,
    entitlementSource: null,
    referralCodeId: null,
    referralRedeemedAt: null
  }
}
