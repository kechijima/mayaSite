// 診断結果ページの「ブロック」(あなたはこんな人です / キャリアパス / 実践的なヒント …)の
// 共通型とアイコン割り当て。pages/result.vue と components/ProfileBlocks.vue の両方から使う。

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
