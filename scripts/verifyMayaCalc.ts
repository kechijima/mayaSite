// utils/mayaCalc.ts の dateToKin() が mayadan.jp と一致することを確認する。
//
// このサイトのKIN番号・紋章・KINの関係性はすべて mayadan.jp を基準にしている。
// 計算式はサーバーにもエミュレータにも依存しないので、いつでも単体で実行できる:
//     npx tsx scripts/verifyMayaCalc.ts
//
// 期待値は mayadan.jp の生年月日フォームに実際に入力して得た値。増やす場合も
// 必ず実測値を入れること — 他サイト(unkoi.com など)の早見表は mayadan.jp と
// 一致しないため、そちらの worked example を根拠にしてはいけない。
import { dateToKin, destinyKins, kinInfo, parseKin, relationSealIndices } from '../utils/mayaCalc'

// [日付, mayadan.jp が返したKIN]
const EXPECTED: [string, number][] = [
  // うるう年の境目。ここが計算式の肝で、過去に2度間違えている。
  ['1992-02-28', 151],
  ['1992-02-29', 152], // 3/1 と同じ値になる(2/28ではない)
  ['1992-03-01', 152],
  ['1992-04-01', 183], // うるう年の3月以降に +1 を足さないことの確認
  ['1992-10-04', 109],
  ['2000-02-29', 212], // 400で割り切れる年もうるう年
  ['2024-06-15', 238],
  ['1964-03-05', 76], // unkoi.com は77としているが mayadan.jp は76
]

let failed = 0
for (const [iso, expected] of EXPECTED) {
  const [y, m, d] = iso.split('-').map(Number)
  const actual = dateToKin(new Date(y, m - 1, d))
  if (actual === expected) {
    console.log(`  \x1b[32m✓\x1b[0m ${iso} → KIN${actual}`)
  } else {
    failed++
    console.log(`  \x1b[31m✗\x1b[0m ${iso} → KIN${actual} (mayadan.jp は KIN${expected})`)
  }
}

// 早見表方式は年を一律365日で進めるため、うるう年は1日ぶん吸収される。
// 具体的には 2/29 が 3/1 と同じKINになる ── つまり進まないのは「3/1」であって
// 2/29 ではない(2/28 → 2/29 は通常どおり +1 進む)。それ以外の日はすべて +1。
// ここが崩れていたら、うるう年の扱いをどこかで余分に足し引きしている。
const breaks: string[] = []
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
let prev = dateToKin(new Date(1900, 0, 1))
for (const cur = new Date(1900, 0, 2); cur <= new Date(2050, 11, 31); cur.setDate(cur.getDate() + 1)) {
  const kin = dateToKin(new Date(cur))
  // うるう年の3/1だけ、前日(2/29)と同じ値になるのが正しい
  const repeats = isLeap(cur.getFullYear()) && cur.getMonth() === 2 && cur.getDate() === 1
  const expected = repeats ? prev : (prev % 260) + 1
  if (kin !== expected) {
    breaks.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`)
  }
  prev = kin
}
if (breaks.length) {
  failed++
  console.log(`\n  \x1b[31m✗\x1b[0m 日ごとの進み方が崩れている箇所が ${breaks.length} 件: ${breaks.slice(0, 5).join(', ')}${breaks.length > 5 ? ' …' : ''}`)
} else {
  console.log('\n  \x1b[32m✓\x1b[0m 1900〜2050の全日付で進み方が正しい(うるう年の3/1だけ2/29と同値、他は+1)')
}

// ?from= の検証に使う relationSealIndices / destinyKins が、診断結果ページ(useDiagnosis)が
// 表示している関係性・運命数字と同じ値を返すこと。ずれると、購入したKINのページから
// 開いた関係性/運命数字ページが解放されない(または無関係なページが解放される)。
const helperMismatches: number[] = []
for (let kin = 1; kin <= 260; kin++) {
  const i = kinInfo(kin)
  const rel = relationSealIndices(kin)
  const des = destinyKins(kin)
  const relOk = rel.join() === [i.guideSealIndex, i.mysticSealIndex, i.antipodeSealIndex, i.analogSealIndex].join()
    && rel.every((s) => Number.isInteger(s) && s >= 0 && s < 20)
  const desOk = des.join() === [kin, i.prevKin, i.nextKin, i.mirrorKin, i.absoluteOppositeKin].join()
    && des.every((k) => parseKin(k) === k)
  if (!relOk || !desOk) helperMismatches.push(kin)
}
const parseOk = parseKin('1') === 1 && parseKin('260') === 260 && parseKin('0') === null
  && parseKin('261') === null && parseKin('1.5') === null && parseKin('abc') === null && parseKin(undefined) === null
if (helperMismatches.length || !parseOk) {
  failed++
  console.log(`\n  \x1b[31m✗\x1b[0m relationSealIndices/destinyKins/parseKin の不一致: ${helperMismatches.slice(0, 5).join(', ')}${parseOk ? '' : ' (parseKin)'}`)
} else {
  console.log('  \x1b[32m✓\x1b[0m 全260KINで relationSealIndices / destinyKins が kinInfo と一致、parseKin の境界値が正しい')
}

console.log(failed === 0 ? '\n\x1b[32mmayadan.jp と一致\x1b[0m\n' : `\n\x1b[31m${failed} 件の不一致\x1b[0m\n`)
process.exit(failed === 0 ? 0 : 1)
