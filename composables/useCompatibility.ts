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
}

export interface CompatibilityResult {
  self: PersonProfile
  others: PersonProfile[]
  pairs: PairCompatibility[]
  // 結果のどこかに出てきた関係の種類(表示順)。説明文をまとめて出すのに使う
  relationTypes: KinRelationType[]
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

    const present = new Set(pairs.flatMap((p) => [...p.forward.rows, ...p.backward.rows].map((r) => r.type)))
    const relationTypes = KIN_RELATION_ORDER.filter((t) => present.has(t))

    return { self, others, pairs, relationTypes }
  })

  return { result }
}
