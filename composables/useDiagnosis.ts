import { SEALS, TONES } from '~/utils/mayaData'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText } from '~/utils/kinProfile'

export interface DiagnosisInput {
  name: string
  birthdate: string
}

export function useDiagnosis(input: Ref<DiagnosisInput>) {
  const result = computed(() => {
    const { birth, now } = diagnoseBirthdate(input.value.birthdate)

    const occultSeal = SEALS[birth.occultSealIndex]
    const currentWavespellSeal = SEALS[now.wavespellSealIndex]
    const currentTone = TONES[now.toneIndex]
    const { sun, wavespell, tone } = buildKinProfileText(birth)

    return {
      name: input.value.name || 'ゲスト',
      kin: birth.kin,
      sealIndex: birth.sealIndex,
      toneIndex: birth.toneIndex,
      wavespellSealIndex: birth.wavespellSealIndex,
      occultSealIndex: birth.occultSealIndex,
      currentWavespellSealIndex: now.wavespellSealIndex,
      sun,
      wavespell,
      tone,
      daysign: {
        seal: occultSeal,
        text: `${occultSeal.essence} これはあなたの中に眠る行動パターンで、日頃は意識しづらいものの、自覚すると力を発揮しやすくなる資質です。`
      },
      tresena: {
        seal: currentWavespellSeal,
        dayInCycle: now.toneIndex + 1,
        tone: currentTone,
        text: `現在のあなたは「${currentWavespellSeal.name}」が導く13日間のうち${now.toneIndex + 1}日目。${currentTone.keyword}を意識すると、今の流れに乗りやすいタイミングです。`
      }
    }
  })

  return { result }
}
