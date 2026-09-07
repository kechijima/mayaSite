// チーム紹介コードの生成・正規化。
//
// コードは referralCodes コレクションの「ドキュメントIDそのもの」になる。これが
// 設計の核で、Firestoreルールが get(ID指定の単一取得) と list(クエリ・列挙) を
// 別々に制御できる性質を使い、「コードを知っている人だけが照合でき、一覧は誰にも
// 列挙できない」を同時に成立させている(firestore.rules の referralCodes 参照)。
// コードをフィールドに持たせて where('code','==',x) で引く形にすると list 権限が
// 必要になり、その瞬間に全コードが列挙可能になって設計が崩れる。
//
// サーバーが無い(ssr:false / Spark プラン)ためコード入力にレート制限をかけられず、
// 推測耐性はランダム部の長さだけが担保している。RANDOM_LENGTH を短くしたり、
// 覚えやすい固定文字列に置き換えたりしないこと。

// 英大文字+数字から、読み違えやすい O/0/I/1/L を除いた31文字。コードを口頭や紙で
// 受け渡す場面を想定した除外。
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const TEAM_ID_LENGTH = 3
const RANDOM_LENGTH = 6

export const CODE_LENGTH = TEAM_ID_LENGTH + RANDOM_LENGTH

// 31 は 256 を割り切らないため、乱数バイトを単純に % 31 するとアルファベット先頭の
// 文字がわずかに出やすくなる(剰余バイアス)。31*8=248 以上のバイトを捨てて引き直す
// ことで、31文字を等確率にしている。
const REJECT_THRESHOLD = ALPHABET.length * 8

function randomString(length: number): string {
  const out: string[] = []
  while (out.length < length) {
    // 不足分ちょうどを引く。捨てられたバイトの分だけループが回る。
    const bytes = new Uint8Array(length - out.length)
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      if (byte < REJECT_THRESHOLD) out.push(ALPHABET[byte % ALPHABET.length])
    }
  }
  return out.join('')
}

// チームIDはチーム作成時に一度だけ生成し、以降変更しない。コードを再発行しても
// この値は据え置くため、users.teamId(所属)とメンバー集計は影響を受けない。
export function generateTeamId(): string {
  return randomString(TEAM_ID_LENGTH)
}

// コード = チームID + ランダム部。先頭3文字でどのチームのコードか管理者が判別できる。
// チームIDは推測耐性には数えない(チーム数が少なく、1つコードが漏れれば知られるため) —
// 防御はランダム部6文字(31^6 ≒ 8.9億通り)が単独で担っている。
export function generateCode(teamId: string): string {
  return `${teamId}${randomString(RANDOM_LENGTH)}`
}

// 利用者の入力ゆれを吸収する。区切りのつもりでハイフンや空白を入れる人がいるため
// 除去し、小文字は大文字に寄せる。
// 除外文字(O/0/I/1/L)の取り違えまでは救わない — 例えば O を 0 に読み替えて補正すると
// 別の有効なコードに化ける可能性があるため、見た目の整形だけに留めている。
export function normalizeCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase()
}

// Firestoreへ問い合わせる前の足切り。長さも文字種も合わないものは存在し得ないので、
// 無駄な読み取りを発生させずにその場で弾く。
export function isCodeShaped(code: string): boolean {
  if (code.length !== CODE_LENGTH) return false
  for (const char of code) {
    if (!ALPHABET.includes(char)) return false
  }
  return true
}

// コードからチームIDを取り出す。管理画面で「このコードはどのチームか」を
// Firestoreを引かずに表示するためのもので、権限判定には使わない
// (所属チームの正当性は firestore.rules が referralCodes ドキュメントの
// teamId と突き合わせて検証する)。
export function teamIdFromCode(code: string): string {
  return code.slice(0, TEAM_ID_LENGTH)
}
