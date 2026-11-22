import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText, type KinProfileText } from '~/utils/kinProfile'
import {
  kinRelationMatches,
  KIN_RELATION_CONTENT,
  KIN_RELATION_ORDER,
  type KinRelationMatch,
  type KinRelationType
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
  // 「kin135のあなたとkin78のAさんは神秘KIN」の文1つぶん。両方向の関係と運命数字をまとめ、
  // 同じ名前の関係は1つにする(2026-11-19 要望: 向きを分けず1文に。片方向だけ当てはまる
  // ガイドKINも同じ形で出す)。運命数字の鏡/絶対反対は KIN の関係性と同じ名前なので重ならない。
  statements: PairStatement[]
}

export interface PairStatement {
  key: string
  label: string
  // 絶対反対KINだけ赤で出す
  danger: boolean
}

// 相性の文に出す関係の種類。KINの関係性6種 + 運命数字の「同じ番号」「連番」
export type ExplainedRelation = KinRelationType | 'same' | 'sequential'

export interface CompatibilityResult {
  self: PersonProfile
  others: PersonProfile[]
  pairs: PairCompatibility[]
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

const EXPLAINED_ORDER: ExplainedRelation[] = [...KIN_RELATION_ORDER, 'same', 'sequential']

export function explainedLabel(t: ExplainedRelation): string {
  return t === 'same' || t === 'sequential' ? DESTINY_RELATION_CONTENT[t].label : KIN_RELATION_CONTENT[t].label
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
        const forward = directional(a, b)
        const backward = directional(b, a)
        const found = new Set<ExplainedRelation>([...forward.rows, ...backward.rows].map((r) => r.type))
        if (destiny) found.add(destiny)
        const statements = EXPLAINED_ORDER.filter((t) => found.has(t)).map((t) => ({
          key: t,
          label: explainedLabel(t),
          danger: t === 'absoluteOpposite'
        }))
        pairs.push({
          key: `${a.id}-${b.id}`,
          a,
          b,
          forward,
          backward,
          destinyRelation: destiny,
          destinyRelationLabel: destiny ? DESTINY_RELATION_CONTENT[destiny].label : null,
          statements
        })
      }
    }

    // 2026-11-22 要望で「関係の説明」の欄(関係ごとの説明文)は削除した。相性の文だけを出す
    return { self, others, pairs }
  })

  return { result }
}
