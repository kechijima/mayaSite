import { SEALS, TONES } from '~/utils/mayaData'
import { diagnoseBirthdate } from '~/utils/mayaCalc'

export interface DiagnosisInput {
  name: string
  birthdate: string
}

export function useDiagnosis(input: Ref<DiagnosisInput>) {
  const result = computed(() => {
    const { birth, now } = diagnoseBirthdate(input.value.birthdate)

    const sunSeal = SEALS[birth.sealIndex]
    const wavespellSeal = SEALS[birth.wavespellSealIndex]
    const wavespellTone = TONES[birth.toneIndex]
    const occultSeal = SEALS[birth.occultSealIndex]
    const currentWavespellSeal = SEALS[now.wavespellSealIndex]
    const currentTone = TONES[now.toneIndex]

    return {
      name: input.value.name || 'ゲスト',
      kin: birth.kin,
      sealIndex: birth.sealIndex,
      toneIndex: birth.toneIndex,
      wavespellSealIndex: birth.wavespellSealIndex,
      occultSealIndex: birth.occultSealIndex,
      currentWavespellSealIndex: now.wavespellSealIndex,
      sun: {
        seal: sunSeal,
        text: `${sunSeal.essence} 太陽の紋章としてのこの資質は、周囲から見えるあなたの「本質」として表れます。`
      },
      wavespell: {
        seal: wavespellSeal,
        tone: wavespellTone,
        text: `${wavespellSeal.essence} この紋章が導くウェイブスペルは、まだ見ぬ可能性——${wavespellTone.keyword}を潜在意識の中に秘めています。`
      },
      tone: {
        info: wavespellTone,
        text: `「${wavespellTone.name}」を持つあなたは、${wavespellTone.keyword}に長けています。これはKINに刻まれた13の音のひとつで、日々の行動やものごとへの向き合い方の根底に流れるリズムです。`
      },
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
