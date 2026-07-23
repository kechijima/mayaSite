import type { KinInfo } from './mayaCalc'
import { SEALS, TONES, type Seal, type Tone } from './mayaData'

export interface KinProfileText {
  sun: { seal: Seal; text: string }
  wavespell: { seal: Seal; tone: Tone; text: string }
  tone: { info: Tone; text: string }
}

// Builds the sun/wavespell/tone template text for a single birth KinInfo. Extracted from
// useDiagnosis.ts so it can be reused per-person by the compatibility feature without going
// through the Vue composable (which is designed for one reactive input at a time).
export function buildKinProfileText(info: KinInfo): KinProfileText {
  const sunSeal = SEALS[info.sealIndex]
  const wavespellSeal = SEALS[info.wavespellSealIndex]
  const wavespellTone = TONES[info.toneIndex]

  return {
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
    }
  }
}
