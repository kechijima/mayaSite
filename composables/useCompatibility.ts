import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText, type KinProfileText } from '~/utils/kinProfile'
import { compatibilityRelation, COMPATIBILITY_RELATION_CONTENT, type CompatibilityRelation } from '~/utils/compatibility'

export interface PersonInput {
  id: string
  name: string
  birthdate: string
}

export interface PersonProfile {
  id: string
  name: string
  birthdate: string
  kin: number
  sealIndex: number
  toneIndex: number
  wavespellSealIndex: number
  sun: KinProfileText['sun']
  wavespell: KinProfileText['wavespell']
  tone: KinProfileText['tone']
}

export interface PairCompatibility {
  otherId: string
  otherName: string
  relation: CompatibilityRelation
  relationLabel: string
  relationText: string
}

export interface CompatibilityResult {
  self: PersonProfile
  others: PersonProfile[]
  pairs: PairCompatibility[]
}

// Free acquisition feature — kept small enough that the form/results stay easy to scan and a
// future persisted payload stays small. Not a hard product requirement, just a sane default.
export const MAX_OTHER_PEOPLE = 5

function buildProfile(person: PersonInput): PersonProfile {
  const { birth } = diagnoseBirthdate(person.birthdate)
  const { sun, wavespell, tone } = buildKinProfileText(birth)
  return {
    id: person.id,
    name: person.name || 'ゲスト',
    birthdate: person.birthdate,
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
      const relation = compatibilityRelation(self.sealIndex, other.sealIndex)
      const content = COMPATIBILITY_RELATION_CONTENT[relation]
      return {
        otherId: other.id,
        otherName: other.name,
        relation,
        relationLabel: content.label,
        relationText: content.text
      }
    })

    return { self, others, pairs }
  })

  return { result }
}
