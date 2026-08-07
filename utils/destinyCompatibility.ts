// Compatibility relation between two people's KIN numbers themselves (not their seals) —
// mirrors the "運命数字" (destiny numbers) already shown per-person on the single-diagnosis
// result page (see mayaCalc.ts's mirrorKin/absoluteOppositeKin/prevKin/nextKin), applied here
// as a pairwise check between self.kin and other.kin. All four checks below are symmetric
// (self vs other gives the same verdict as other vs self) — mirrorKin/absoluteOppositeKin are
// both involutions (applying the transform twice returns the original value), 'same' is
// trivially symmetric, and 'sequential' (±1) holds regardless of which side is +1.
export type DestinyRelation = 'same' | 'sequential' | 'mirror' | 'absoluteOpposite'

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

// A match here is meaningful precisely because it's rare — with 260 possible KIN values, most
// pairs hit none of these and destinyRelation() returns null (no badge shown for that pair).
export function destinyRelation(kinA: number, kinB: number): DestinyRelation | null {
  if (kinA === kinB) return 'same'
  const diff = mod(kinB - kinA, 260)
  if (diff === 1 || diff === 259) return 'sequential'
  if (kinB === 261 - kinA) return 'mirror'
  if (kinB === mod(kinA - 1 + 130, 260) + 1) return 'absoluteOpposite'
  return null
}

export const DESTINY_RELATION_CONTENT: Record<DestinyRelation, { label: string; text: string }> = {
  same: {
    label: '同じ番号KIN',
    text: '生まれ持ったKIN番号がまったく同じ「同じ番号KIN」の関係です。紋章も音も一致する、極めて稀な深い縁。魂の双子とも言えるほど価値観や人生のリズムが重なり合います。'
  },
  sequential: {
    label: '連番KIN',
    text: 'ツォルキンの並びで隣り合う「連番KIN」の関係です。片方が歩みを止めたところから、もう片方が自然と続きを歩き出すような、途切れない連続性のあるつながりです。'
  },
  mirror: {
    label: '鏡の向こうの自分KIN',
    text: '260からお互いのKINを引くと一致する「鏡の向こうの自分KIN」の関係です。相手の中に、もうひとりの自分を見るような感覚を覚える相性。映し合うことでお互いの本質に気づかせてくれます。'
  },
  absoluteOpposite: {
    label: '絶対反対KIN',
    text: 'ツォルキンの周期上ちょうど正反対に位置する「絶対反対KIN」の関係です。立場や視点が真逆だからこそ、補い合うことで一人では届かないバランスに手が届く相性です。'
  }
}
