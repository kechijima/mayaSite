// KIN別の有名人(docs/芸能人マスタ.xlsx由来)。Firestore の kin-* ドキュメントには
// `kinCelebrities` として「オブジェクトの配列」で入っている — 表示側でパースが不要になるため
// (詳細は composables/useDiagnosisContent.ts の KinCelebrity のコメント参照)。
//
// 一方、管理画面(pages/admin/content/[id].vue)の編集フォームは text / textarea / 箇条書きの
// 3種類しか扱えないので、そこでは「1行1人・全角縦棒区切り」のテキストに変換して見せている
// (現状は表示のみ。下の parseKinCelebrities のコメント参照)。
// 銀河の音の celebrities が同じ形式のテキストなのと揃えてあり、管理者から見た操作感は同じ。

export interface KinCelebrity {
  name: string
  birthdate: string // YYYY-MM-DD。マスタに生年月日が無いものは空文字
  field: string // 「俳優・歌手」など自由文
}

const SEPARATOR = '｜'

/** 配列 → 編集用テキスト(1行1人)。 */
export function formatKinCelebrities(list: KinCelebrity[]): string {
  return list.map((c) => [c.name, c.birthdate, c.field].join(SEPARATOR)).join('\n')
}

/**
 * 生年月日を YYYY-MM-DD に正規化する。管理者が「1993年9月13日」「1993/9/13」と書いても
 * 受け付ける。どの形式にも当てはまらない場合は入力をそのまま返す — 解釈できないという理由で
 * 黙って消すと、打ち間違いなのか元から空なのかが分からなくなるため(表示側は YYYY-MM-DD 以外を
 * 日付として出さないので、画面上は日付なしとして扱われる)。
 */
export function normalizeBirthdate(value: string): string {
  const text = value.trim()
  if (!text) return ''
  const m =
    /^(\d{1,4})-(\d{1,2})-(\d{1,2})$/.exec(text) ||
    /^(\d{1,4})\/(\d{1,2})\/(\d{1,2})$/.exec(text) ||
    /^(\d{1,4})年(\d{1,2})月(\d{1,2})日$/.exec(text)
  if (!m) return text
  return `${m[1].padStart(4, '0')}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

/**
 * 有名人カードの生年月日表示用。マスタに生年月日が無い2件は空文字で入っているので、
 * その場合は日付を出さない(呼び出し側で空文字を判定してレイアウトを出し分ける)。
 */
export function formatCelebrityBirth(birthdate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate)
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : ''
}

/**
 * 編集用テキスト → 配列。空行と、名前が空の行は捨てる。
 *
 * 2026-08-17時点では未使用 — 管理画面は表示のみで、書き込みは firestore.rules で全面拒否
 * されている(管理者認証が未導入のため)。formatKinCelebrities と対になる処理なので、
 * 書き込みを有効化する際にそのまま使えるよう残してある。
 */
export function parseKinCelebrities(text: string): KinCelebrity[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // 全角「｜」で書くのが正だが、半角「|」で入力されても受け付ける。
      const [name = '', birthdate = '', field = ''] = line.split(/[｜|]/).map((part) => part.trim())
      return { name, birthdate: normalizeBirthdate(birthdate), field }
    })
    .filter((c) => c.name)
}
