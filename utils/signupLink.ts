import type { LocationQuery } from 'vue-router'

// 会員登録ページ(/signup・/signup/referral)への遷移先を組み立てる。
// pages/plans.vue(購入プラン選択)と、/signup ⇔ /signup/referral の相互リンクから使う。
// redirectで元のページへ戻れるようにしつつ、診断フォームで入力済みのname/birth/genderも
// トップレベルのクエリとして転送し、登録フォームに入力済みで表示できるようにする
// (redirect値の中に入れ子にすると?/&の再エンコードで壊れやすいため、
// 別クエリとして渡す — URLSearchParamsが自動的に安全にエンコードしてくれる)。
export function buildSignupLink(
  redirect: string | null,
  query: LocationQuery,
  path: '/signup' | '/signup/referral' = '/signup'
): string {
  const params = new URLSearchParams()
  if (redirect) params.set('redirect', redirect)
  const name = query.name
  const birth = query.birth
  const gender = query.gender
  if (typeof name === 'string' && name) params.set('name', name)
  if (typeof birth === 'string' && birth) params.set('birth', birth)
  if (typeof gender === 'string' && gender) params.set('gender', gender)
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

// ?redirect= の検証。外部サイトへ飛ばされないよう、"/"で始まり"//"で始まらないものだけを受け付ける。
export function safeRedirect(target: unknown): string | null {
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : null
}
