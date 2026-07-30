// Compatibility relation between two people, derived purely from their sealIndex (0-19).
// This is a self-contained convention for this site, not a literal Dreamspell "guide seal"
// calculation (which depends on tone and is easy to get wrong) — it deliberately reuses the
// same +10 offset already trusted for `antipodeSealIndex` in mayaCalc.ts for the "antipode" case.
export type CompatibilityRelation = 'twin' | 'analog' | 'antipode' | 'mystic'

export function compatibilityRelation(sealIndexA: number, sealIndexB: number): CompatibilityRelation {
  if (sealIndexA === sealIndexB) return 'twin'
  if (sealIndexB === (19 - sealIndexA + 20) % 20) return 'analog'
  if (sealIndexB === (sealIndexA + 10) % 20) return 'antipode'
  return 'mystic'
}

export const COMPATIBILITY_RELATION_CONTENT: Record<CompatibilityRelation, { label: string; text: string }> = {
  twin: {
    label: '双子紋章',
    text: 'お互いに同じ紋章を持つ「双子紋章」の関係です。価値観や物事の捉え方が驚くほど似ており、言葉にしなくても通じ合える安心感があります。似た者同士だからこそ、相手の長所も課題もよく理解できる間柄です。'
  },
  analog: {
    label: '類似紋章',
    text: '紋章は異なりますが、本質的な資質が響き合う「類似紋章」の関係です。表面的なスタイルは違っても根っこの部分で自然と息が合い、無理なく協力し合える相性です。'
  },
  antipode: {
    label: '拮抗紋章',
    text: '正反対の資質を持つ「拮抗紋章」の関係です。見ている景色が違うぶん最初はぶつかることもありますが、その違いこそが互いに足りない部分を補い合い、大きく成長させてくれる刺激的な相性です。'
  },
  mystic: {
    label: '神秘紋章',
    text: '一見すると特別な接点は見えにくい「神秘紋章」の関係です。だからこそ知れば知るほど新しい発見があり、時間をかけて向き合うことで思いがけない深い縁に育っていく相性です。'
  }
}

export function toneMatchText(toneMatch: boolean): string {
  return toneMatch
    ? '銀河の音（トーン）も同じで、物事に取り組むテンポやリズムが自然と合いやすい二人です。'
    : '銀河の音（トーン）は異なり、物事に取り組むテンポにはそれぞれの個性があります。お互いのペースを尊重すると、より心地よい関係になるでしょう。'
}
