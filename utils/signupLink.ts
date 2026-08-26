import type { LocationQuery } from 'vue-router'

// pages/result.vue・pages/kin/[sealIndex].vueのLockedVeilから/signupへ渡す遷移先を組み立てる。
// redirectで元のページへ戻れるようにしつつ、診断フォームで入力済みのname/birth/genderも
// トップレベルのクエリとして転送し、pages/signup.vueが会員登録フォームに入力済みで
// 表示できるようにする(redirect値の中に入れ子にすると?/&の再エンコードで壊れやすいため、
// 別クエリとして渡す — URLSearchParamsが自動的に安全にエンコードしてくれる)。
export function buildSignupLink(fullPath: string, query: LocationQuery): string {
  const params = new URLSearchParams({ redirect: fullPath })
  const name = query.name
  const birth = query.birth
  const gender = query.gender
  if (typeof name === 'string' && name) params.set('name', name)
  if (typeof birth === 'string' && birth) params.set('birth', birth)
  if (typeof gender === 'string' && gender) params.set('gender', gender)
  return `/signup?${params.toString()}`
}
