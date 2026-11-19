import type { PersonInput } from '~/composables/useCompatibility'
import { isGender, DEFAULT_GENDER } from '~/utils/gender'

// 相性診断の入力を /compatibility/result のクエリに載せる形式。
// 1人を `生年月日_性別_名前` の1文字列にし、`p` を人数ぶん繰り返す(先頭が自分)。
// 生年月日(YYYY-MM-DD)と性別は `_` を含まないので、名前に `_` があっても先頭2つで切れば復元できる。
// 2026-11-19: フォームと結果を別ページに分けた(ブラウザの戻るで入力画面に戻れるように)。
// 結果をURLで持つので、再読み込みや共有でも同じ結果が出る。

const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function encodePerson(p: Pick<PersonInput, 'name' | 'birthdate' | 'gender'>): string {
  return `${p.birthdate}_${p.gender}_${p.name}`
}

export function decodePerson(raw: string, id: string): PersonInput | null {
  const first = raw.indexOf('_')
  const second = first < 0 ? -1 : raw.indexOf('_', first + 1)
  if (first < 0 || second < 0) return null
  const birthdate = raw.slice(0, first)
  const gender = raw.slice(first + 1, second)
  const name = raw.slice(second + 1)
  if (!BIRTHDATE_RE.test(birthdate)) return null
  return { id, name, birthdate, gender: isGender(gender) ? gender : DEFAULT_GENDER }
}

/** `p` クエリ(文字列 or 配列)を自分+相手に戻す。自分が無い・相手が0人なら null。 */
export function decodePeople(query: unknown): { self: PersonInput; others: PersonInput[] } | null {
  const list = (Array.isArray(query) ? query : [query]).filter((v): v is string => typeof v === 'string')
  const people = list.map((raw, i) => decodePerson(raw, i === 0 ? 'self' : `other-${i - 1}`))
  if (people.some((p) => p === null)) return null
  const [self, ...others] = people as PersonInput[]
  if (!self || others.length === 0) return null
  return { self, others }
}
