// 到達度診断テストの結果画面に出すフィードバック文の初稿(紋章 × カテゴリ × 4段階)。
// 段階の並びは utils/achievementTestFeedback.ts の TEST_BAND_RANGE(71％以上 / 51〜70％ / 31〜50％ / 30％以下)。
// scripts/seedAchievementFeedback.ts が achievementFeedback/{sealIndex} に入れる。入れた後の手直しは
// 管理画面(/admin/tests/[sealIndex])で行い、こちらは初期値として残す。

export interface SeedFeedback {
  sealIndex: number
  sealName: string
  feedback: Record<'thinking' | 'action' | 'relationship' | 'belief' | 'skill', [string, string, string, string]>
}

export const ACHIEVEMENT_FEEDBACK_SEED: SeedFeedback[] = []
