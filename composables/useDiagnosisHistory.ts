import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore'
import { SEALS, TONES } from '~/utils/mayaData'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import type { Gender } from '~/utils/gender'
import type { PersonProfile } from './useCompatibility'

export interface PersonSummary {
  name: string
  birthdate: string
  gender: Gender
  kin: number
  sealIndex: number
  sealName: string
  toneIndex: number
  toneName: string
  wavespellSealIndex: number
  wavespellSealName: string
}

export interface SingleHistoryDoc {
  type: 'single'
  createdAt: unknown // serverTimestamp() sentinel on write; a Firestore Timestamp once read back
  person: PersonSummary
}

export interface CompatibilityHistoryDoc {
  type: 'compatibility'
  createdAt: unknown
  self: PersonSummary
  others: PersonSummary[]
}

interface ProfileLike {
  name: string
  birthdate: string
  gender: Gender
  kin: number
  sealIndex: number
  toneIndex: number
  wavespellSealIndex: number
}

function summaryFromProfile(p: ProfileLike): PersonSummary {
  return {
    name: p.name,
    birthdate: p.birthdate,
    gender: p.gender,
    kin: p.kin,
    sealIndex: p.sealIndex,
    sealName: SEALS[p.sealIndex].name,
    toneIndex: p.toneIndex,
    toneName: TONES[p.toneIndex].name,
    wavespellSealIndex: p.wavespellSealIndex,
    wavespellSealName: SEALS[p.wavespellSealIndex].name
  }
}

// Writes a best-effort log of every diagnosis submission to Firestore for admin viewing
// (see pages/admin/history/index.vue). A logging failure must never block or degrade the
// user's actual diagnosis flow — both record functions swallow errors themselves, so callers
// invoke them without awaiting (fire-and-forget) right alongside navigation/result rendering.
export function useDiagnosisHistory() {
  const { $firestore } = useNuxtApp()

  async function recordSingleDiagnosis(input: { name: string; birthdate: string; gender: Gender }) {
    try {
      const { birth } = diagnoseBirthdate(input.birthdate)
      const doc = {
        type: 'single' as const,
        createdAt: serverTimestamp(),
        person: summaryFromProfile({ name: input.name || 'ゲスト', birthdate: input.birthdate, gender: input.gender, ...birth })
      }
      await addDoc(collection($firestore as Firestore, 'diagnosisHistory'), doc)
    } catch (error) {
      console.warn('[diagnosisHistory] failed to record single diagnosis', error)
    }
  }

  async function recordCompatibilityDiagnosis(self: PersonProfile, others: PersonProfile[]) {
    try {
      const doc = {
        type: 'compatibility' as const,
        createdAt: serverTimestamp(),
        self: summaryFromProfile(self),
        others: others.map(summaryFromProfile)
      }
      await addDoc(collection($firestore as Firestore, 'diagnosisHistory'), doc)
    } catch (error) {
      console.warn('[diagnosisHistory] failed to record compatibility diagnosis', error)
    }
  }

  return { recordSingleDiagnosis, recordCompatibilityDiagnosis }
}
