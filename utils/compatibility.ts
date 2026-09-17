// 相性診断の判定。mayadan.jp の相性診断(https://mayadan.jp/congeniality/result)と同じ組み合わせ・
// 同じ規則で、「X さんから見て Y さんは○○KIN」に当てはまるものを列挙する。向きのある判定なので、
// X→Y と Y→X は別々に呼ぶ(結果も一致するとは限らない — ガイドKINは非対称)。
//
// mayadan.jp の結果を実際に送信して確かめた規則(2026-09-17):
//   神秘KIN / 反対KIN / 類似KIN … 紋章(アーキタイプ)同士の関係。X の太陽の紋章・ウェイブスペルと
//     Y の太陽の紋章・ウェイブスペルの全4通りを比べる。
//       神秘 = 19 − 紋章 / 反対 = 紋章 + 10 / 類似 = 17 − 紋章(いずれも mod 20。mayaCalc.ts と同じ式)
//   ガイドKIN … X のガイドの紋章(太陽の紋章と銀河の音から決まる、kinInfo の guideSealIndex)が
//     Y の「太陽の紋章」と一致するときだけ。Y のウェイブスペルとは比べない(一致しても mayadan は出さない)。
//   鏡の向こうの自分KIN / 絶対反対KIN … 紋章ではなくKIN番号同士の関係。1組につき1行(表示は太陽の紋章)。
//
// 太陽の紋章とウェイブスペルが同じ紋章の人(音1のKIN)は同じ関係が2行出るが、mayadan もそうなので
// 重複は除かない(属性ラベルで区別して表示する)。並び順も mayadan に合わせている:
//   ガイド → 神秘 → 反対 → 類似 → 鏡 → 絶対反対、同じ関係の中は X 太陽→Y 太陽, X 太陽→Y WS, X WS→Y 太陽, X WS→Y WS。
//
// scripts/verifyCompatibility.ts が mayadan.jp の実際の結果と突き合わせる。このファイルは tsx からも
// 読めるよう ~/ を使わず相対 import にしている。
import { kinInfo } from './mayaCalc'
import { RELATION_DESCRIPTION } from './kinRelations'
import { DESTINY_RELATION_CONTENT } from './destinyCompatibility'

export type SealAttribute = 'sun' | 'wavespell'
export type KinRelationType = 'guide' | 'mystic' | 'antipode' | 'analog' | 'mirror' | 'absoluteOpposite'

export const KIN_RELATION_ORDER: KinRelationType[] = ['guide', 'mystic', 'antipode', 'analog', 'mirror', 'absoluteOpposite']

export interface KinRelationMatch {
  type: KinRelationType
  fromAttribute: SealAttribute
  fromSealIndex: number
  toAttribute: SealAttribute
  toSealIndex: number
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

const SEAL_RELATIONS: { type: 'mystic' | 'antipode' | 'analog'; target: (seal: number) => number }[] = [
  { type: 'mystic', target: (s) => mod(19 - s, 20) },
  { type: 'antipode', target: (s) => mod(s + 10, 20) },
  { type: 'analog', target: (s) => mod(17 - s, 20) }
]

export function kinRelationMatches(fromKin: number, toKin: number): KinRelationMatch[] {
  const from = kinInfo(fromKin)
  const to = kinInfo(toKin)
  const matches: KinRelationMatch[] = []
  const sunOnly = (type: KinRelationType): KinRelationMatch => ({
    type, fromAttribute: 'sun', fromSealIndex: from.sealIndex, toAttribute: 'sun', toSealIndex: to.sealIndex
  })

  if (from.guideSealIndex === to.sealIndex) matches.push(sunOnly('guide'))

  const fromSeals: [SealAttribute, number][] = [['sun', from.sealIndex], ['wavespell', from.wavespellSealIndex]]
  const toSeals: [SealAttribute, number][] = [['sun', to.sealIndex], ['wavespell', to.wavespellSealIndex]]
  for (const { type, target } of SEAL_RELATIONS) {
    for (const [fromAttribute, fromSealIndex] of fromSeals) {
      for (const [toAttribute, toSealIndex] of toSeals) {
        if (toSealIndex === target(fromSealIndex)) {
          matches.push({ type, fromAttribute, fromSealIndex, toAttribute, toSealIndex })
        }
      }
    }
  }

  if (to.kin === from.mirrorKin) matches.push(sunOnly('mirror'))
  if (to.kin === from.absoluteOppositeKin) matches.push(sunOnly('absoluteOpposite'))
  return matches
}

// 鏡の向こうの自分KIN・絶対反対KINは紋章ではなくKIN番号の関係(行の表示で属性ラベルを出さない)。
export function isKinLevelRelation(type: KinRelationType): boolean {
  return type === 'mirror' || type === 'absoluteOpposite'
}

// 説明文は診断結果ページの「KINの関係性」(utils/kinRelations.ts)と運命数字(utils/destinyCompatibility.ts)の
// 文をそのまま使う — 同じ関係に2種類の説明があると読み手が混乱するため。
export const KIN_RELATION_CONTENT: Record<KinRelationType, { label: string; text: string }> = {
  guide: { label: 'ガイドKIN', text: RELATION_DESCRIPTION['ガイドKIN'] },
  mystic: { label: '神秘KIN', text: RELATION_DESCRIPTION['神秘KIN'] },
  antipode: { label: '反対KIN', text: RELATION_DESCRIPTION['反対KIN'] },
  analog: { label: '類似KIN', text: RELATION_DESCRIPTION['類似KIN'] },
  mirror: { label: '鏡の向こうの自分KIN', text: DESTINY_RELATION_CONTENT.mirror.text },
  absoluteOpposite: { label: '絶対反対KIN', text: DESTINY_RELATION_CONTENT.absoluteOpposite.text }
}
