import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText, type KinProfileText } from '~/utils/kinProfile'
import { compatibilityRelation, COMPATIBILITY_RELATION_CONTENT, type CompatibilityRelation } from '~/utils/compatibility'
import { destinyRelation, DESTINY_RELATION_CONTENT, type DestinyRelation } from '~/utils/destinyCompatibility'
import { SEALS } from '~/utils/mayaData'
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
  sealIndex: number
  toneIndex: number
  wavespellSealIndex: number
  sun: KinProfileText['sun']
  wavespell: KinProfileText['wavespell']
  tone: KinProfileText['tone']
}

// 太陽の紋章とウェイブスペルは両方とも「その人を表す紋章」なので、自分の太陽/ウェイブスペルと
// 相手の太陽/ウェイブスペルの全4通りの組み合わせを見せる(ペア単位で1つの代表紋章に集約しない)。
// compatibilityRelation() 自体はsealIndexの差分だけで決まる対称な判定(自分→相手でも相手→自分
// でも同じ結果)なので、"自分から見た/相手から見た"という向きの違いは、どちらの紋章同士を比較
// するかという組み合わせの違いとして表現される。
export type SealAttribute = 'sun' | 'wavespell'
export interface SealCombinationRelation {
  selfAttribute: SealAttribute
  selfSealIndex: number
  selfSealName: string
  otherAttribute: SealAttribute
  otherSealIndex: number
  otherSealName: string
  relation: CompatibilityRelation
  relationLabel: string
}

export interface PairCompatibility {
  otherId: string
  otherName: string
  otherKin: number
  // 太陽/ウェイブスペル全4通りの組み合わせ
  combinations: SealCombinationRelation[]
  // 運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)によるKIN番号同士の相性。該当なしならnull
  destinyRelation: DestinyRelation | null
  destinyRelationLabel: string | null
}

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
    sealIndex: birth.sealIndex,
    toneIndex: birth.toneIndex,
    wavespellSealIndex: birth.wavespellSealIndex,
    sun,
    wavespell,
    tone
  }
}

export function useCompatibility(input: Ref<{ self: PersonInput; others: PersonInput[] }>) {
  const result = computed<CompatibilityResult>(() => {
    const self = buildProfile(input.value.self)
    const others = input.value.others.map(buildProfile)

    const pairs: PairCompatibility[] = others.map((other) => {
      const combinations: SealCombinationRelation[] = (
        [
          ['sun', 'sun', self.sealIndex, other.sealIndex],
          ['sun', 'wavespell', self.sealIndex, other.wavespellSealIndex],
          ['wavespell', 'sun', self.wavespellSealIndex, other.sealIndex],
          ['wavespell', 'wavespell', self.wavespellSealIndex, other.wavespellSealIndex]
        ] as const
      ).map(([selfAttribute, otherAttribute, selfSeal, otherSeal]) => {
        const combinationRelation = compatibilityRelation(selfSeal, otherSeal)
        return {
          selfAttribute,
          selfSealIndex: selfSeal,
          selfSealName: SEALS[selfSeal].name,
          otherAttribute,
          otherSealIndex: otherSeal,
          otherSealName: SEALS[otherSeal].name,
          relation: combinationRelation,
          relationLabel: COMPATIBILITY_RELATION_CONTENT[combinationRelation].label
        }
      })

      const destiny = destinyRelation(self.kin, other.kin)
      const destinyContent = destiny ? DESTINY_RELATION_CONTENT[destiny] : null

      return {
        otherId: other.id,
        otherName: other.name,
        otherKin: other.kin,
        combinations,
        destinyRelation: destiny,
        destinyRelationLabel: destinyContent?.label ?? null
      }
    })

    return { self, others, pairs }
  })

  return { result }
}
