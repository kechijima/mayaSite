import { SEALS } from '~/utils/mayaData'
import { diagnoseBirthdate } from '~/utils/mayaCalc'
import { buildKinProfileText } from '~/utils/kinProfile'

export interface DiagnosisInput {
  name: string
  birthdate: string
}

export function useDiagnosis(input: Ref<DiagnosisInput>) {
  const result = computed(() => {
    const { birth } = diagnoseBirthdate(input.value.birthdate)

    const mysticSeal = SEALS[birth.mysticSealIndex]
    const { sun, wavespell, tone } = buildKinProfileText(birth)

    return {
      name: input.value.name || 'ゲスト',
      kin: birth.kin,
      sealIndex: birth.sealIndex,
      toneIndex: birth.toneIndex,
      wavespellSealIndex: birth.wavespellSealIndex,
      sun,
      wavespell,
      tone,
      // KINの関係性(ガイド/神秘/反対/類似KIN)・運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)。
      // 算出式の根拠は utils/mayaCalc.ts のコメントを参照。
      relations: {
        guide: { index: birth.guideSealIndex, ...SEALS[birth.guideSealIndex] },
        mystic: { index: birth.mysticSealIndex, ...mysticSeal },
        antipode: { index: birth.antipodeSealIndex, ...SEALS[birth.antipodeSealIndex] },
        analog: { index: birth.analogSealIndex, ...SEALS[birth.analogSealIndex] }
      },
      destinyNumbers: {
        sameNumberKin: birth.kin,
        prevKin: birth.prevKin,
        nextKin: birth.nextKin,
        mirrorKin: birth.mirrorKin,
        absoluteOppositeKin: birth.absoluteOppositeKin
      }
    }
  })

  return { result }
}
