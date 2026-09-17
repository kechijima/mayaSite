// 相性診断の判定(utils/compatibility.ts の kinRelationMatches)が mayadan.jp の相性診断と一致するかの検証。
// 期待値は https://mayadan.jp/congeniality/result に生年月日を実際に送信して得た結果の文面そのもの
// (2026-09-17 取得)。ガイドKINは相手の太陽の紋章とだけ比べる、音1のKINは同じ行が2回出る、
// 鏡の向こうの自分KIN/絶対反対KINはKIN番号同士、といった規則をすべて含むように人を選んである。
//
// Run via: npm run verify:compatibility (エミュレータ不要)
import { kinRelationMatches } from '../utils/compatibility'
import { SEALS } from '../utils/mayaData'

const MAYADAN_LABEL = {
  guide: 'ガイドkin', mystic: '神秘kin', antipode: '反対kin', analog: '類似kin',
  mirror: '鏡の向こうの自分kin', absoluteOpposite: '絶対反対kin'
} as const

interface Person { name: string; kin: number }
interface Case { title: string; people: Person[]; expected: string[] }

const CASES: Case[] = [
  {
    title: '反対kin・類似kin(ウェイブスペル同士を含む)',
    people: [{ name: '自分', kin: 7 }, { name: '相手A', kin: 138 }, { name: '相手B', kin: 121 }],
    expected: [
      'Kin7の自分さん（赤い竜）から見てkin138の相手Aさん（青い猿）は反対kin',
      'Kin7の自分さん（赤い竜）から見てkin138の相手Aさん（白い鏡）は類似kin',
      'Kin7の自分さん（赤い竜）から見てkin121の相手Bさん（白い鏡）は類似kin',
      'Kin138の相手Aさん（青い猿）から見てkin7の自分さん（赤い竜）は反対kin',
      'Kin138の相手Aさん（青い猿）から見てkin121の相手Bさん（赤い竜）は反対kin',
      'Kin138の相手Aさん（白い鏡）から見てkin7の自分さん（赤い竜）は類似kin',
      'Kin138の相手Aさん（白い鏡）から見てkin121の相手Bさん（赤い竜）は類似kin',
      'Kin121の相手Bさん（赤い竜）から見てkin138の相手Aさん（青い猿）は反対kin',
      'Kin121の相手Bさん（白い鏡）から見てkin7の自分さん（赤い竜）は類似kin',
      'Kin121の相手Bさん（赤い竜）から見てkin138の相手Aさん（白い鏡）は類似kin'
    ]
  },
  {
    title: 'ガイドkin・神秘kin・鏡の向こうの自分kin・絶対反対kin・音1の重複行',
    people: [
      { name: 'S', kin: 7 }, { name: 'M254', kin: 254 }, { name: 'O137', kin: 137 },
      { name: 'G19', kin: 19 }, { name: 'X14', kin: 14 }, { name: 'X1', kin: 1 }
    ],
    expected: [
      'Kin7のSさん（青い手）から見てkin19のG19さん（青い嵐）はガイドkin',
      'Kin7のSさん（青い手）から見てkin254のM254さん（白い魔法使い）は神秘kin',
      'Kin7のSさん（青い手）から見てkin19のG19さん（白い魔法使い）は神秘kin',
      'Kin7のSさん（青い手）から見てkin14のX14さん（白い魔法使い）は神秘kin',
      'Kin7のSさん（青い手）から見てkin14のX14さん（白い魔法使い）は神秘kin',
      'Kin7のSさん（青い手）から見てkin137のO137さん（赤い地球）は反対kin',
      'Kin7のSさん（赤い竜）から見てkin137のO137さん（青い猿）は反対kin',
      'Kin7のSさん（青い手）から見てkin254のM254さん（白い魔法使い）は鏡の向こうの自分kin',
      'Kin7のSさん（青い手）から見てkin137のO137さん（赤い地球）は絶対反対kin',
      'Kin254のM254さん（白い魔法使い）から見てkin7のSさん（青い手）は神秘kin',
      'Kin254のM254さん（黄色い星）から見てkin137のO137さん（青い猿）は類似kin',
      'Kin254のM254さん（白い魔法使い）から見てkin7のSさん（青い手）は鏡の向こうの自分kin',
      'Kin137のO137さん（赤い地球）から見てkin7のSさん（青い手）は反対kin',
      'Kin137のO137さん（青い猿）から見てkin7のSさん（赤い竜）は反対kin',
      'Kin137のO137さん（青い猿）から見てkin1のX1さん（赤い竜）は反対kin',
      'Kin137のO137さん（青い猿）から見てkin1のX1さん（赤い竜）は反対kin',
      'Kin137のO137さん（青い猿）から見てkin254のM254さん（黄色い星）は類似kin',
      'Kin137のO137さん（赤い地球）から見てkin7のSさん（青い手）は絶対反対kin',
      'Kin19のG19さん（白い魔法使い）から見てkin7のSさん（青い手）は神秘kin',
      'Kin14のX14さん（白い魔法使い）から見てkin254のM254さん（白い魔法使い）はガイドkin',
      'Kin14のX14さん（白い魔法使い）から見てkin7のSさん（青い手）は神秘kin',
      'Kin14のX14さん（白い魔法使い）から見てkin7のSさん（青い手）は神秘kin',
      'Kin1のX1さん（赤い竜）から見てkin137のO137さん（青い猿）は反対kin',
      'Kin1のX1さん（赤い竜）から見てkin137のO137さん（青い猿）は反対kin'
    ]
  },
  {
    title: 'ウェイブスペルから見た神秘kin・ガイドはウェイブスペルと比べない',
    people: [{ name: 'S', kin: 7 }, { name: 'T20', kin: 20 }, { name: 'T81', kin: 80 }],
    expected: [
      'Kin7のSさん（赤い竜）から見てkin20のT20さん（黄色い太陽）は神秘kin',
      'Kin7のSさん（青い手）から見てkin20のT20さん（白い魔法使い）は神秘kin',
      'Kin7のSさん（赤い竜）から見てkin80のT81さん（黄色い太陽）は神秘kin',
      'Kin20のT20さん（白い魔法使い）から見てkin7のSさん（青い手）は神秘kin',
      'Kin20のT20さん（黄色い太陽）から見てkin7のSさん（赤い竜）は神秘kin',
      'Kin20のT20さん（黄色い太陽）から見てkin80のT81さん（青い嵐）は類似kin',
      'Kin80のT81さん（黄色い太陽）から見てkin7のSさん（赤い竜）は神秘kin',
      'Kin80のT81さん（青い嵐）から見てkin20のT20さん（黄色い太陽）は類似kin'
    ]
  }
]

function ours(people: Person[]): string[] {
  const lines: string[] = []
  for (const from of people) {
    for (const to of people) {
      if (from === to) continue
      for (const m of kinRelationMatches(from.kin, to.kin)) {
        lines.push(`Kin${from.kin}の${from.name}さん（${SEALS[m.fromSealIndex].name}）から見てkin${to.kin}の${to.name}さん（${SEALS[m.toSealIndex].name}）は${MAYADAN_LABEL[m.type]}`)
      }
    }
  }
  return lines
}

let failed = 0
for (const c of CASES) {
  const actual = ours(c.people).sort()
  const expected = [...c.expected].sort()
  const missing = expected.filter((l, i) => expected.indexOf(l) === i && expected.filter((x) => x === l).length > actual.filter((x) => x === l).length)
  const extra = actual.filter((l, i) => actual.indexOf(l) === i && actual.filter((x) => x === l).length > expected.filter((x) => x === l).length)
  if (missing.length || extra.length) {
    failed++
    console.log(`  \x1b[31m✗\x1b[0m ${c.title}`)
    for (const l of missing) console.log(`      不足: ${l}`)
    for (const l of extra) console.log(`      余分: ${l}`)
  } else {
    console.log(`  \x1b[32m✓\x1b[0m ${c.title}(${expected.length}行)`)
  }
}
console.log(failed === 0 ? '\n\x1b[32mmayadan.jp と一致\x1b[0m\n' : `\n\x1b[31m${failed} 件の不一致\x1b[0m\n`)
process.exit(failed === 0 ? 0 : 1)
