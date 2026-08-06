// 銀河の音プロフィールの「有名人」欄は、Firestoreには1行1人・"｜"区切りのプレーンテキストとして
// 保存する(diagnosisContent.celebrities)。CHARACTER_PROFILE_FIELDS/TONE_PROFILE_FIELDS が
// text/textarea の2種類しか持たない admin 編集フォーム(pages/admin/content/[id].vue)にそのまま
// 収まる形にするため、配列フィールドをFirestoreスキーマに増やすのではなく、既存のtextarea編集パターン
// に寄せた。表示側(pages/result.vue)はこれをパースしてテーブル状に描画する。
export interface ToneCelebrity {
  name: string
  birthdate: string
  kin: string
  combo: string // "太陽の紋章 × ウェイブスペル"
}

export function formatCelebrities(list: ToneCelebrity[]): string {
  return list.map((c) => [c.name, c.birthdate, c.kin, c.combo].join('｜')).join('\n')
}

export function parseCelebrities(raw: string | undefined | null): ToneCelebrity[] {
  if (!raw) return []
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = '', birthdate = '', kin = '', combo = ''] = line.split('｜').map((s) => s.trim())
      return { name, birthdate, kin, combo }
    })
}
