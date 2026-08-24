// 診断結果ページの「ブロック」(あなたはこんな人です / キャリアパス / 実践的なヒント …)の
// 共通型とアイコン割り当て。pages/result.vue と components/ProfileBlocks.vue の両方から使う。

import type { CharacterProfileFields } from '~/composables/useDiagnosisContent'

// 2026-08-10: 純粋な箇条書きのフィールドはFirestore側もstring[]に変更した
// (scripts/migrateBulletFields.ts参照)。混在フィールド(bestEnvironment/bestRole/
// luckDownHabits)は対象外で従来通りstring。表示側はkindで分岐し、textはpタグ、listは
// チェックアイコン付きの.checklistとして描画する。
export type ProfileSection = { label: string } & (
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }
  // あなたの性格の強み(strengthsSummary+strengthsDetail)・注意すべき傾向(cautionSummary+
  // cautionDetail)専用 — 箇条書きの要約に続けて、プレーンな文章の詳細を1ブロック内に表示する。
  | { kind: 'list-then-text'; items: string[]; text: string }
)

// アイコンは見た目だけの割り当て(業務ロジックとは無関係)。ラベル文字列は
// pages/result.vue の free/premiumProfileSections で定義した固定値と一致させている。
const SECTION_ICON: Record<string, string> = {
  '総合解説': 'i-scroll',
  'あなたはこんな人です': 'i-crown',
  'キャリアパス': 'i-path',
  'あなたが喜ぶこと': 'i-heart',
  'あなたが嫌がること': 'i-heart-off',
  'コミュニケーションの強み': 'i-chat',
  'コミュニケーションの課題': 'i-chat-x',
  'あなたの性格の強み': 'i-gem',
  '注意すべき傾向': 'i-warn',
  '実践的なヒント': 'i-bulb',
  '人生で一番伸びる環境': 'i-sprout',
  '人生で一番向いている役割': 'i-shield',
  '恋愛・パートナーシップ': 'i-heart',
  '仕事で成功する方法': 'i-trophy',
  '運気が上がる行動': 'i-clover',
  '運気が下がるクセ': 'i-clover-off',
  '基本スペック': 'i-crown',
  '性格の強み': 'i-gem',
  '注意するべき点': 'i-warn'
}

export function iconFor(label: string) {
  return SECTION_ICON[label] ?? 'i-scroll'
}

// 紋章プロフィール(docs/診断結果マスタ.xlsx由来)の深掘り項目。マスタの行構成(1〜14行目=無料、
// 15行目以降=有料)に合わせて分割している。太陽の紋章・ウェイブスペルに加え、KINの関係性の
// 詳細ページ(pages/kin/[sealIndex].vue)でも同じcharacter-*ドキュメントを使うため、
// pages/result.vueから切り出してここで共有する。
export function freeProfileSections(p: CharacterProfileFields | null): ProfileSection[] {
  if (!p) return []
  const sections: (ProfileSection | null)[] = [
    p.careerPath ? { kind: 'text', label: 'キャリアパス', text: p.careerPath } : null,
    p.likes?.length ? { kind: 'list', label: 'あなたが喜ぶこと', items: p.likes } : null,
    p.dislikes?.length ? { kind: 'list', label: 'あなたが嫌がること', items: p.dislikes } : null,
    p.communicationStrengths?.length ? { kind: 'list', label: 'コミュニケーションの強み', items: p.communicationStrengths } : null,
    p.communicationChallenges?.length ? { kind: 'list', label: 'コミュニケーションの課題', items: p.communicationChallenges } : null,
    p.strengthsSummary?.length ? { kind: 'list-then-text', label: 'あなたの性格の強み', items: p.strengthsSummary, text: p.strengthsDetail ?? '' } : null,
    p.cautionSummary?.length ? { kind: 'list-then-text', label: '注意すべき傾向', items: p.cautionSummary, text: p.cautionDetail ?? '' } : null
  ]
  return sections.filter((s): s is ProfileSection => s !== null)
}

// cautionDetailPremiumは元々マスタの同一セル(row14+15)を1つのフィールドとして結合していた
// ものを分割した経緯があり、「注意すべき傾向」の続きとしてpremium側に表示する — 詳細は
// scripts/characters.data.ts の2026-08-05コメント参照。
export function premiumProfileSections(p: CharacterProfileFields | null): ProfileSection[] {
  if (!p) return []
  const sections: (ProfileSection | null)[] = [
    p.cautionDetailPremium ? { kind: 'text', label: '', text: p.cautionDetailPremium } : null,
    p.practicalTips?.length ? { kind: 'list', label: '実践的なヒント', items: p.practicalTips } : null,
    p.bestEnvironment ? { kind: 'text', label: '人生で一番伸びる環境', text: p.bestEnvironment } : null,
    p.bestRole ? { kind: 'text', label: '人生で一番向いている役割', text: p.bestRole } : null,
    p.loveAndPartnership ? { kind: 'text', label: '恋愛・パートナーシップ', text: p.loveAndPartnership } : null,
    p.careerSuccess ? { kind: 'text', label: '仕事で成功する方法', text: p.careerSuccess } : null,
    p.luckUpActions?.length ? { kind: 'list', label: '運気が上がる行動', items: p.luckUpActions } : null,
    p.luckDownHabits ? { kind: 'text', label: '運気が下がるクセ', text: p.luckDownHabits } : null
  ]
  return sections.filter((s): s is ProfileSection => s !== null)
}
