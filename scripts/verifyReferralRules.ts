// firestore.rules のうち、紹介コード周り(users / referralCodes / referralTeams /
// diagnosisContentPremium)が意図通りに効いているかをエミュレータで検証する。
//
// このアプリにはサーバーが無く、ルールが唯一の防御線になっている(仕様書6章)。
// 「クライアント側のUIで防いでいるつもり」が実際にはルールで防げていない、という
// 取り違えが最も危険なので、UIを介さず生のSDKから直接叩いて確認する。
//
// 実行: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
//         npx tsx scripts/verifyReferralRules.ts
// 本番プロジェクトには絶対に向けないこと(テストデータを書き込むため、
// エミュレータ環境変数が無ければ起動時に停止する)。
import { getApps, initializeApp as initAdminApp } from 'firebase-admin/app'
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore'
import { initializeApp as initClientApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  type Auth
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
  getFirestore as getClientFirestore,
  type Firestore
} from 'firebase/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST が未設定です。エミュレータ専用のスクリプトです。')
  process.exit(1)
}

const projectId = 'mayachannel-34fd5'

const adminApp = getApps().length ? getApps()[0] : initAdminApp({ projectId })
const adminDb = getAdminFirestore(adminApp)

const clientApp = initClientApp({ apiKey: 'fake-api-key', projectId }, 'verify-client')
const auth: Auth = getAuth(clientApp)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db: Firestore = getClientFirestore(clientApp)
connectFirestoreEmulator(db, '127.0.0.1', 8080)

const ACTIVE_TEAM = 'K7M'
const ACTIVE_CODE = 'K7M3QP9XR'
const OTHER_TEAM = 'B8T'
const OTHER_CODE = 'B8TX4LTR2'
const DISABLED_TEAM = 'P42'
const DISABLED_CODE = 'P42M9NDKQ'

const TEAM_NAMES: Record<string, string> = {
  [ACTIVE_TEAM]: 'Aチーム', [OTHER_TEAM]: 'Bチーム', [DISABLED_TEAM]: 'Cチーム'
}
function teamNameOf(teamId: string) {
  return TEAM_NAMES[teamId] ?? '不明なチーム'
}

let passed = 0
let failed = 0

function pass(label: string) {
  passed++
  console.log(`  \x1b[32m✓\x1b[0m ${label}`)
}
function fail(label: string, detail: unknown) {
  failed++
  const message = detail instanceof Error ? detail.message : String(detail)
  console.log(`  \x1b[31m✗\x1b[0m ${label}\n      ${message}`)
}
function isDenied(err: unknown) {
  return (err as { code?: string })?.code === 'permission-denied'
}

async function expectAllow(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    pass(label)
  } catch (err) {
    fail(label, err)
  }
}
async function expectDeny(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    fail(label, '拒否されるべき操作が成功してしまった')
  } catch (err) {
    if (isDenied(err)) pass(label)
    else fail(label, `permission-denied 以外のエラー: ${err}`)
  }
}

// 各テストは別ユーザーで実行する。アプリ全体でAuthインスタンスは1つなので、
// 1タブ1ユーザーと同じ制約がここにも効く — 都度サインアウトして作り直す。
let userSeq = 0
async function freshUser(): Promise<string> {
  await signOut(auth).catch(() => {})
  const email = `verify-${Date.now()}-${userSeq++}@example.com`
  const cred = await createUserWithEmailAndPassword(auth, email, 'password123')
  return cred.user.uid
}

function baseProfile() {
  return {
    name: '検証 太郎',
    phone: '09000000000',
    email: 'verify@example.com',
    birthdate: '1992-10-16',
    gender: 'female',
    plan: 'free',
    createdAt: serverTimestamp()
  }
}
function unaffiliated() {
  return {
    teamId: null,
    teamName: null,
    entitlement: 'none',
    entitlementSource: null,
    referralCodeId: null,
    referralRedeemedAt: null
  }
}
function redeemed(code: string, teamId: string, teamName = teamNameOf(teamId)) {
  return {
    teamId,
    teamName,
    entitlement: 'code',
    entitlementSource: 'code',
    referralCodeId: code,
    referralRedeemedAt: serverTimestamp()
  }
}

async function seed() {
  // ルールを迂回できるAdmin SDKで、管理者が作った状態を用意する。
  await adminDb.collection('referralCodes').doc(ACTIVE_CODE).set({
    teamId: ACTIVE_TEAM, teamName: 'Aチーム', status: 'active'
  })
  await adminDb.collection('referralCodes').doc(OTHER_CODE).set({
    teamId: OTHER_TEAM, teamName: 'Bチーム', status: 'active'
  })
  await adminDb.collection('referralCodes').doc(DISABLED_CODE).set({
    teamId: DISABLED_TEAM, teamName: 'Cチーム', status: 'disabled'
  })
  await adminDb.collection('referralTeams').doc(ACTIVE_TEAM).set({
    name: 'Aチーム', code: ACTIVE_CODE, note: '社外秘のメモ'
  })
  await adminDb.collection('diagnosisContentPremium').doc('character-3').set({
    practicalTips: ['有料の本文'], type: 'character', index: 3
  })
  await adminDb.collection('diagnosisContent').doc('character-3').set({
    freeText: '無料の本文', type: 'character', index: 3, status: '公開'
  })
}

async function main() {
  await seed()

  console.log('\n▸ 会員登録(users create)')
  {
    const uid = await freshUser()
    await expectAllow('コード無しで登録できる', () =>
      setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated() }))
  }
  {
    const uid = await freshUser()
    await expectAllow('有効なコードを添えて登録できる', () =>
      setDoc(doc(db, 'users', uid), { ...baseProfile(), ...redeemed(ACTIVE_CODE, ACTIVE_TEAM) }))
  }
  {
    const uid = await freshUser()
    await expectDeny('無効化されたコードでは登録できない', () =>
      setDoc(doc(db, 'users', uid), { ...baseProfile(), ...redeemed(DISABLED_CODE, DISABLED_TEAM) }))
  }
  {
    const uid = await freshUser()
    await expectDeny('存在しないコードでは登録できない', () =>
      setDoc(doc(db, 'users', uid), { ...baseProfile(), ...redeemed('ZZZ99999X', 'ZZZ') }))
  }
  {
    const uid = await freshUser()
    await expectDeny('コード無しで entitlement:code を自称できない', () =>
      setDoc(doc(db, 'users', uid), {
        ...baseProfile(), ...unaffiliated(), entitlement: 'code'
      }))
  }
  {
    const uid = await freshUser()
    await expectDeny('有効なコードでも teamId は偽装できない', () =>
      setDoc(doc(db, 'users', uid), {
        ...baseProfile(), ...redeemed(ACTIVE_CODE, OTHER_TEAM)
      }))
  }
  {
    const uid = await freshUser()
    await expectDeny('有効なコードでも teamName は偽装できない', () =>
      setDoc(doc(db, 'users', uid), {
        ...baseProfile(), ...redeemed(ACTIVE_CODE, ACTIVE_TEAM, '勝手に名乗ったチーム')
      }))
  }
  {
    const uid = await freshUser()
    await expectDeny('plan:paid を名乗って登録できない', () =>
      setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated(), plan: 'paid' }))
  }

  console.log('\n▸ 後追いのコード入力(users update)')
  {
    const uid = await freshUser()
    await setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated() })
    await expectAllow('未所属の会員は後からコードを入力できる', () =>
      updateDoc(doc(db, 'users', uid), redeemed(ACTIVE_CODE, ACTIVE_TEAM)))
    await expectDeny('一度所属したら別のコードに入れ替えられない', () =>
      updateDoc(doc(db, 'users', uid), redeemed(OTHER_CODE, OTHER_TEAM)))
  }
  {
    const uid = await freshUser()
    await setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated() })
    await updateDoc(doc(db, 'users', uid), redeemed(ACTIVE_CODE, ACTIVE_TEAM))
    // 管理者による「チームから外す」操作を Admin SDK で再現する。
    // referralRedeemedAt は履歴として残すのが仕様(仕様書4章)。
    await adminDb.collection('users').doc(uid).update({
      teamId: null, entitlement: 'none', entitlementSource: null
    })
    await expectDeny('除外された会員は自分でコードを入れ直して復帰できない', () =>
      updateDoc(doc(db, 'users', uid), redeemed(ACTIVE_CODE, ACTIVE_TEAM)))
  }
  {
    const uid = await freshUser()
    await setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated() })
    await expectAllow('氏名などの通常のプロフィール編集はできる', () =>
      updateDoc(doc(db, 'users', uid), { name: '改名 後太郎' }))
    await expectDeny('プロフィール編集に紛れて plan は変えられない', () =>
      updateDoc(doc(db, 'users', uid), { name: '改名', plan: 'paid' }))
    await expectDeny('プロフィール編集に紛れて entitlement は変えられない', () =>
      updateDoc(doc(db, 'users', uid), { name: '改名', entitlement: 'code' }))
  }

  console.log('\n▸ コードの可視範囲(referralCodes / referralTeams)')
  {
    await freshUser()
    await expectAllow('コード文字列を知っていれば1件だけ取得できる', () =>
      getDoc(doc(db, 'referralCodes', ACTIVE_CODE)))
    await expectDeny('コード一覧は列挙できない', () =>
      getDocs(collection(db, 'referralCodes')))
    await expectDeny('チーム(管理者メモを含む)は読めない', () =>
      getDoc(doc(db, 'referralTeams', ACTIVE_TEAM)))
  }

  console.log('\n▸ 有料本文(diagnosisContentPremium)')
  {
    const uid = await freshUser()
    await setDoc(doc(db, 'users', uid), { ...baseProfile(), ...unaffiliated() })
    await expectAllow('無料本文は誰でも読める', () =>
      getDoc(doc(db, 'diagnosisContent', 'character-3')))
    await expectDeny('未所属の会員は有料本文を読めない', () =>
      getDoc(doc(db, 'diagnosisContentPremium', 'character-3')))
  }
  {
    const uid = await freshUser()
    await setDoc(doc(db, 'users', uid), { ...baseProfile(), ...redeemed(ACTIVE_CODE, ACTIVE_TEAM) })
    await expectAllow('チーム所属の会員は有料本文を読める', () =>
      getDoc(doc(db, 'diagnosisContentPremium', 'character-3')))
  }
  {
    await signOut(auth).catch(() => {})
    await expectDeny('未ログインでは有料本文を読めない', () =>
      getDoc(doc(db, 'diagnosisContentPremium', 'character-3')))
  }

  console.log(`\n${failed === 0 ? '\x1b[32m' : '\x1b[31m'}${passed} passed, ${failed} failed\x1b[0m\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
