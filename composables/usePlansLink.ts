import type { MaybeRefOrGetter } from 'vue'

// 有料エリア(LockedVeil)の「続きを購入する」の遷移先 = 購入プラン選択ページ(pages/plans.vue)。
// ログイン状態に関わらず常にここへ送る(未ログイン/ログイン済みの分岐は /plans 側で行う)。
//
// kin … 単体購入の対象になるKIN番号。null なら /plans は「この記事のみ」を出さない。
//        /result は表示中のKIN、関係性/運命数字ページは検証済みの ?from= のKIN
//        (運命数字ページは from が無ければ表示中のKIN)を渡す。
// redirect … 元のページ。登録・購入後にそこへ戻す。
// name/birth/gender … 診断フォームの入力。/plans → /signup で登録フォームを入力済みにするため
//        トップレベルのクエリとしても引き継ぐ(utils/signupLink.ts と同じ理由)。
export function usePlansLink(kin: MaybeRefOrGetter<number | null>) {
  const route = useRoute()

  return computed(() => {
    const params = new URLSearchParams()
    const k = toValue(kin)
    if (k !== null) params.set('kin', String(k))
    params.set('redirect', route.fullPath)
    for (const key of ['name', 'birth', 'gender'] as const) {
      const v = route.query[key]
      if (typeof v === 'string' && v) params.set(key, v)
    }
    return `/plans?${params.toString()}`
  })
}
