import type { Gender } from '~/utils/gender'

// 直前に見た診断結果(/result)の KIN と性別。ピッタリ到達度テストへの導線(ヘッダー・固定フッター)が
// 未ログインの人の紋章を /test?kin= で引き継ぐのに使う(2026-11-19)。固定フッターは、これが入っている
// (= 診断結果を見た後の)ときだけ出す。useState なので再読み込みで消える — /result を開けば入り直す。
export interface LastDiagnosis {
  kin: number
  gender: Gender
}

export function useLastDiagnosis() {
  const last = useState<LastDiagnosis | null>('last-diagnosis', () => null)
  // /test へのリンク。会員は /test 側で自分の紋章に置き換わるので、付けても害は無い
  const testLink = computed(() => ({ path: '/test', query: last.value ? { kin: String(last.value.kin), gender: last.value.gender } : {} }))
  return { last, testLink }
}
