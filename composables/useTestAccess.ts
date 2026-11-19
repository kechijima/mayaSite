import { diagnoseBirthdate, kinInfo, parseKin } from '~/utils/mayaCalc'
import { isGender, type Gender } from '~/utils/gender'

// ピッタリ到達度テスト(/test, /test/take, /test/result/[id])の出し分け。
// 2026-11-19: 全員に開放した(要望)。受けるのは誰でもでき、結果を見られるかと記録が残るかが変わる。
//
//   loading   … 認証の復元か users ドキュメントの取得が終わっていない
//   guest     … 未ログイン(または会員情報の無い管理者アカウントなど)。直前に診断した KIN の
//               太陽の紋章(?kin=)で受ける。結果はぼかし、記録は残さない
//   suspended … 利用停止中。受けられない
//   free      … 無料会員。自分の太陽の紋章で受け、記録は残す。結果はぼかす(有料会員になれば見える)
//   ok        … チーム会員または有料会員。自分の太陽の紋章で受け、結果も見える
//
// firestore.rules と対: 問題(achievementTests)と表示設定は誰でも読め、受験結果は利用停止でない
// 会員なら本人が書ける。フィードバック文(achievementFeedback)だけは今もチーム会員・有料会員に限る —
// ぼかした画面には本文を出さないので、読めない人は読みに行かない(TestResultSheet の locked)。
export type TestAccess = 'loading' | 'guest' | 'suspended' | 'free' | 'ok'

export interface TestSeal {
  sealIndex: number
  kin: number
  gender: Gender
}

export function useTestAccess() {
  const route = useRoute()
  const { user, ready } = useAuth()
  const { profile, settled, suspended, entitled } = useEntitlement()

  const access = computed<TestAccess>(() => {
    if (!ready.value) return 'loading'
    if (!user.value) return 'guest'
    if (!settled.value) return 'loading'
    if (!profile.value) return 'guest'
    if (suspended.value) return 'suspended'
    // entitled = 停止でなく、有料会員かチーム所属(composables/useEntitlement.ts)
    return entitled.value ? 'ok' : 'free'
  })

  // 結果をぼかすか。ok 以外はぼかす
  const locked = computed(() => access.value !== 'ok')
  // 記録が残るか(会員なら残す)
  const canSave = computed(() => access.value === 'ok' || access.value === 'free')

  // 受ける紋章。会員は登録した生年月日の太陽の紋章、未ログインは診断結果から渡された ?kin=。
  const seal = computed<TestSeal | null>(() => {
    if (access.value === 'ok' || access.value === 'free') {
      const birthdate = profile.value?.birthdate
      if (!birthdate) return null
      try {
        const { birth } = diagnoseBirthdate(birthdate)
        const g = profile.value?.gender
        return { sealIndex: birth.sealIndex, kin: birth.kin, gender: typeof g === 'string' && isGender(g) ? g : 'female' }
      } catch {
        return null
      }
    }
    const kin = parseKin(route.query.kin)
    if (kin === null) return null
    const g = String(route.query.gender ?? '')
    return { sealIndex: kinInfo(kin).sealIndex, kin, gender: isGender(g) ? g : 'female' }
  })

  // 判定が固まるまで(認証の復元・会員情報の取得)は画面を覆う。TestAccessNotice はその間なにも出さない。
  useLoadingWhile('test-access', () => access.value === 'loading')

  // 未ログインの人の紋章を次の画面へ引き継ぐクエリ(/test → /test/take など)
  const sealQuery = computed(() => (access.value === 'guest' && seal.value ? { kin: String(seal.value.kin), gender: seal.value.gender } : {}))
  const loginLink = computed(() => `/login?redirect=${encodeURIComponent(route.fullPath)}`)
  const signupLink = computed(() => `/signup?redirect=${encodeURIComponent(route.fullPath)}`)
  const plansLink = computed(() => `/plans?redirect=${encodeURIComponent(route.fullPath)}`)
  return { access, locked, canSave, seal, sealQuery, user, profile, loginLink, signupLink, plansLink }
}
