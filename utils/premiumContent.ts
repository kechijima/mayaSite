// 無料/有料の境界の定義。読み出し側(composables/pages)・管理画面・移行スクリプトの
// 3者が同じ境界を見る必要があるため、ここ1箇所に集約している。
//
// Nuxtのエイリアス(~/)を使わず、値のimportを持たない自己完結の形にしてあるのは、
// scripts/ 配下が tsx で直接実行されエイリアスを解決できないため
// (scripts/seedTones.ts が '../utils/mayaData' と相対で書いているのと同じ事情)。
//
// 背景: 有料項目は元々 diagnosisContent の無料項目と同じドキュメントに同居していた。
// Firestoreのルールはフィールド単位の制御ができないため、その状態では
// 「無料は全公開・有料は非公開」が原理的に実現できず、未ログインでも開発者ツールから
// 有料本文を読めてしまっていた。コレクションを diagnosisContentPremium に分けることで
// 初めてルールで守れるようになる(firestore.rules 参照)。

// 紋章プロフィール(docs/診断結果マスタ.xlsx由来)のうち、diagnosisContentPremium へ
// 移す項目。マスタの15行目以降に対応する。cautionDetailPremium は元々マスタの
// 同一セル(row14+15)だったものの後半で、「注意すべき傾向」の続きとして表示される。
export const PREMIUM_CHARACTER_FIELDS = [
  'cautionDetailPremium',
  'practicalTips',
  'bestEnvironment',
  'bestRole',
  'loveAndPartnership',
  'careerSuccess',
  'luckUpActions',
  'luckDownHabits'
] as const

export type PremiumCharacterField = (typeof PREMIUM_CHARACTER_FIELDS)[number]

export function isPremiumCharacterField(key: string): key is PremiumCharacterField {
  return (PREMIUM_CHARACTER_FIELDS as readonly string[]).includes(key)
}

// KIN番号の読み物(docs/KIN番号診断結果マスタ.xlsx由来)は1本の続き文章で、紋章のような
// 項目単位の区切りが無い。そのため文字数で切る — 冒頭125文字が無料、残りが有料。
export const KIN_LETTER_FREE_CHARS = 125

// サロゲートペアの途中で切らないよう[...str]で文字単位に分解してから切る。
// trimはここでは行わない — 分割前の原文を freeText + restText で完全に復元できる
// ようにしておき、表示上の整形(末尾の三点リーダ等)は呼び出し側に任せるため。
export function splitKinText(text: string): { freeText: string; restText: string } {
  const chars = [...text]
  if (chars.length <= KIN_LETTER_FREE_CHARS) return { freeText: text, restText: '' }
  return {
    freeText: chars.slice(0, KIN_LETTER_FREE_CHARS).join(''),
    restText: chars.slice(KIN_LETTER_FREE_CHARS).join('')
  }
}

// LockedVeilの「残り○○文字」表示用の文字数。分離後は未権限ユーザーが有料本文を
// 読めなくなり、表示側で数えられなくなるため、無料側ドキュメントに数値だけを
// 持たせる(本文そのものは渡さないというLockedVeilの設計意図は維持される)。
// utils/profileSections.ts の countChars と同じ数え方 — 見出しラベルは本文では
// ないので数えず、配列は区切り無しで連結した長さを足す。
export function countPremiumChars(fields: Record<string, unknown>): number {
  let total = 0
  for (const key of PREMIUM_CHARACTER_FIELDS) {
    const value = fields[key]
    if (typeof value === 'string') total += value.length
    else if (Array.isArray(value)) total += value.join('').length
  }
  return total
}
