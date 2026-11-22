import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText, type KinProfileText } from '~/utils/kinProfile'
import {
  kinRelationMatches,
  KIN_RELATION_CONTENT,
  KIN_RELATION_ORDER,
  type KinRelationMatch
} from '~/utils/compatibility'
import { destinyRelation, DESTINY_RELATION_CONTENT, type DestinyRelation } from '~/utils/destinyCompatibility'
import { SEALS, type Seal } from '~/utils/mayaData'
import type { Gender } from '~/utils/gender'

export interface PersonInput {
  id: string
  name: string
  birthdate: string
  gender: Gender
}

export interface PersonProfile {
  id: string
  name: string
  birthdate: string
  gender: Gender
  kin: number
  mirrorKin: number
  absoluteOppositeKin: number
  sealIndex: number
  toneIndex: number
  wavespellSealIndex: number
  sun: KinProfileText['sun']
  wavespell: KinProfileText['wavespell']
  tone: KinProfileText['tone']
  // KINの関係性(ガイド/反対/神秘/類似KIN) — useDiagnosis.tsのresult.relationsと同じ構成。
  relations: {
    guide: Seal & { index: number }
    antipode: Seal & { index: number }
    mystic: Seal & { index: number }
    analog: Seal & { index: number }
  }
}

// 相性は参加者全員の全組み合わせ(自分×A、自分×B、A×B…)で出す。判定は向きがあるので
// 1組につき「a から見た b」「b から見た a」の両方を持つ(utils/compatibility.ts)。
export interface RelationRow extends KinRelationMatch {
  fromSealName: string
  toSealName: string
  label: string
}

export interface DirectionalRelations {
  from: PersonProfile
  to: PersonProfile
  // 当てはまる関係だけ。空なら「該当なし」
  rows: RelationRow[]
}

export interface PairCompatibility {
  key: string
  a: PersonProfile
  b: PersonProfile
  forward: DirectionalRelations
  backward: DirectionalRelations
  // 運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)によるKIN番号同士の相性。該当なしならnull
  destinyRelation: DestinyRelation | null
  destinyRelationLabel: string | null
}

// 相性の文1行ぶん。mayadan.jp の結果と同じ「Kin7の自分さん（赤い竜）から見てkin138の相手Aさん（青い猿）は反対kin」
// の形(2026-11-22 要望。それまでは2人の組ごとに関係名だけを1文にまとめていた)。
export interface RelationLine {
  key: string
  from: PersonProfile
  to: PersonProfile
  fromSealName: string
  toSealName: string
  label: string
  // 絶対反対KINだけ赤で出す
  danger: boolean
}


export interface CompatibilityResult {
  self: PersonProfile
  others: PersonProfile[]
  pairs: PairCompatibility[]
  // 見る側の人ごとの行(参加者の並び順)。行の並びは mayadan と同じく、関係の種類(ガイド→神秘→反対→類似→鏡→絶対反対)
  // ごとに相手を参加者順に並べる。まったく同じ文になる行(音1のKINで太陽の紋章とウェイブスペルが同じ紋章のとき)は
  // mayadan では2回出るが、重複して見えるので1つにする。
  lineGroups: { from: PersonProfile; lines: RelationLine[] }[]
  // 運命数字の「同じ番号」「連番」(mayadan には無い関係。向きが無いので2人で1文)
  destinyLines: { key: string; a: PersonProfile; b: PersonProfile; label: string }[]
  // 関係も運命数字も当てはまらない組
  unrelatedPairs: { key: string; a: PersonProfile; b: PersonProfile }[]
}

// Free acquisition feature — kept small enough that the form/results stay easy to scan and a
// future persisted payload stays small. Not a hard product requirement, just a sane default.
export const MAX_OTHER_PEOPLE = 6

function buildProfile(person: PersonInput): PersonProfile {
  const { birth } = diagnoseBirthdate(person.birthdate)
  const { sun, wavespell, tone } = buildKinProfileText(birth)
  return {
    id: person.id,
    name: person.name || 'ゲスト',
    birthdate: person.birthdate,
    gender: person.gender,
    kin: birth.kin,
    mirrorKin: birth.mirrorKin,
    absoluteOppositeKin: birth.absoluteOppositeKin,
    sealIndex: birth.sealIndex,
    toneIndex: birth.toneIndex,
    wavespellSealIndex: birth.wavespellSealIndex,
    sun,
    wavespell,
    tone,
    relations: {
      guide: { index: birth.guideSealIndex, ...SEALS[birth.guideSealIndex] },
      antipode: { index: birth.antipodeSealIndex, ...SEALS[birth.antipodeSealIndex] },
      mystic: { index: birth.mysticSealIndex, ...SEALS[birth.mysticSealIndex] },
      analog: { index: birth.analogSealIndex, ...SEALS[birth.analogSealIndex] }
    }
  }
}

function directional(from: PersonProfile, to: PersonProfile): DirectionalRelations {
  return {
    from,
    to,
    rows: kinRelationMatches(from.kin, to.kin).map((m) => ({
      ...m,
      fromSealName: SEALS[m.fromSealIndex].name,
      toSealName: SEALS[m.toSealIndex].name,
      label: KIN_RELATION_CONTENT[m.type].label
    }))
  }
}

export function useCompatibility(input: Ref<{ self: PersonInput; others: PersonInput[] }>) {
  const result = computed<CompatibilityResult>(() => {
    const self = buildProfile(input.value.self)
    const others = input.value.others.map(buildProfile)
    const people = [self, ...others]

    const pairs: PairCompatibility[] = []
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const a = people[i]
        const b = people[j]
        const destiny = destinyRelation(a.kin, b.kin)
        pairs.push({
          key: `${a.id}-${b.id}`,
          a,
          b,
          forward: directional(a, b),
          backward: directional(b, a),
          destinyRelation: destiny,
          destinyRelationLabel: destiny ? DESTINY_RELATION_CONTENT[destiny].label : null
        })
      }
    }

    // 向きごとの行を「見る側の人 → 関係の種類 → 相手(参加者順)」の順に並べる(mayadan と同じ)
    const rowsOf = (from: PersonProfile, to: PersonProfile) => {
      const pair = pairs.find((p) => (p.a === from && p.b === to) || (p.a === to && p.b === from))!
      return pair.a === from ? pair.forward.rows : pair.backward.rows
    }
    const lineGroups = people.map((from) => {
      const seen = new Set<string>()
      const lines: RelationLine[] = []
      for (const type of KIN_RELATION_ORDER) {
        for (const to of people) {
          if (to === from) continue
          for (const r of rowsOf(from, to)) {
            if (r.type !== type) continue
            const key = `${from.id}-${to.id}-${type}-${r.fromSealIndex}-${r.toSealIndex}`
            if (seen.has(key)) continue
            seen.add(key)
            lines.push({ key, from, to, fromSealName: r.fromSealName, toSealName: r.toSealName, label: r.label, danger: type === 'absoluteOpposite' })
          }
        }
      }
      return { from, lines }
    }).filter((g) => g.lines.length)

    // 運命数字の鏡/絶対反対は KIN の関係性(上の行)と同じなので、ここでは同じ番号・連番だけを出す
    const destinyLines = pairs
      .filter((p) => p.destinyRelation === 'same' || p.destinyRelation === 'sequential')
      .map((p) => ({ key: p.key, a: p.a, b: p.b, label: p.destinyRelationLabel! }))
    const unrelatedPairs = pairs
      .filter((p) => !p.forward.rows.length && !p.backward.rows.length && !p.destinyRelation)
      .map((p) => ({ key: p.key, a: p.a, b: p.b }))

    // 2026-11-22 要望で「関係の説明」の欄(関係ごとの説明文)は削除した。相性の文だけを出す
    return { self, others, pairs, lineGroups, destinyLines, unrelatedPairs }
  })

  return { result }
}
