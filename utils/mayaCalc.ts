// Tzolkin (260-day sacred calendar) KIN calculator. The reference implementation is
// mayadan.jp — the site this project's KIN readings and relation formulas come from —
// and the numbers here are matched against it, NOT against a Dreamspell/GMT
// astronomical correlation.
//
// The method is the Japanese "KIN早見表" (quick-reference table): a per-year base value
// that advances by exactly 365 days every calendar year (never 366), plus a fixed
// per-month offset taken from a **non-leap** day table, plus the day of month.
//
// **There is no leap-year correction, and February 29 is not special-cased.** Both fall
// out of the non-leap month table on their own:
//     2/29 → 31 (days before Feb) + 29 = 60
//     3/1  → 59 (days before Mar) + 1  = 60
// so Feb 29 lands on the same KIN as March 1, which is exactly what mayadan.jp returns.
// Because the year step is a flat 365, every date after Feb 29 in a leap year is one
// behind a true continuous day count — that is inherent to the 早見表 method, not a bug.
//
// 2026-09-09: an earlier version added +1 for March of leap years and folded 2/29 onto
// 2/28. Both were wrong against mayadan.jp (1992-03-01 came out KIN153 instead of 152,
// and 2/29 came out 151 instead of 152), and the March-only +1 also left a visible
// discontinuity at April 1 of every leap year. They came from following unkoi.com's
// printed table instead; unkoi.com and mayadan.jp do not agree with each other, so
// don't re-introduce a correction from another site's worked examples.
//
// Verified against mayadan.jp: 1992-02-28→151, 1992-02-29→152, 1992-03-01→152,
// 1992-04-01→183, 1992-10-04→109 (see scripts/verifyMayaCalc.ts).
const REFERENCE_YEAR = 1910
const REFERENCE_JAN_VALUE = 62 // table's base value for January of 1910 (and every +52-year multiple)
const YEAR_STEP = 105 // 365 mod 260 — constant per calendar year, leap years included
const CUMULATIVE_DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] // non-leap, Jan–Dec

// KIN関係性(ガイド/神秘/反対/類似KIN)・運命数字(鏡の向こうの自分/絶対反対KIN)の算出式。
// 自前で定義したものではなく、mayadan.jp (https://mayadan.jp/kin/{n}) の実データを複数KIN
// (紋章14で13音すべて、さらに紋章0・17でも1点ずつ)突き合わせて逆算・検証済み:
//   反対KIN seal  = (sealIndex + 10) mod 20         例: KIN135(紋章14)→紋章4 ✓
//   神秘KIN seal  = 19 - sealIndex                  例: KIN135(紋章14)→紋章5 ✓
//   類似KIN seal  = (17 - sealIndex + 20) mod 20     例: KIN135(紋章14)→紋章3、KIN18(紋章17)→紋章0 ✓
//   ガイドKIN seal = (sealIndex + GUIDE_OFFSETS[toneIndex % 5]) mod 20
//     — 紋章14固定・音1〜13すべてで実測したところ、オフセットは (tone-1)%5 で長さ5周期。
//       音1,6,11→オフセット0(自分自身)は確認済みだが、音2,7,12/3,8,13/4,9/5,10 のオフセットは
//       紋章14での実測1系統のみに基づく値なので、別の紋章でも同じテーブルになるかは要追加検証。
//   鏡の向こうの自分KIN = 261 - kin                  例: KIN135→126 ✓
//   絶対反対KIN         = ((kin - 1 + 130) mod 260) + 1  例: KIN135→5 ✓
// 「同じ番号」「連番」はmayadan.jpの個別KINページ上に見当たらず定義未確認だったため、
// ユーザーに直接確認のうえ以下で確定:
//   同じ番号KIN = kin自身(自明。他の3項目と並べて表示する目的の値)
//   連番KIN     = kinの前後(kin-1とkin+1、260↔1で循環)
const GUIDE_OFFSETS = [0, 12, 4, 16, 8] // indexed by toneIndex % 5

export interface KinInfo {
  kin: number // 1-260
  sealIndex: number // 0-19
  toneIndex: number // 0-12 (tone number = toneIndex + 1)
  wavespellSealIndex: number // 0-19, seal that opens the current 13-day wavespell
  antipodeSealIndex: number // 0-19, 反対KIN ("opposite") — sealIndex + 10
  mysticSealIndex: number // 0-19, 神秘KIN ("mystic/hidden power") — 19 - sealIndex
  analogSealIndex: number // 0-19, 類似KIN ("analog/similar") — 17 - sealIndex
  guideSealIndex: number // 0-19, ガイドKIN ("guide") — tone-dependent offset from sealIndex
  mirrorKin: number // 1-260, 鏡の向こうの自分KIN
  absoluteOppositeKin: number // 1-260, 絶対反対KIN
  prevKin: number // 1-260, 連番KIN(前)
  nextKin: number // 1-260, 連番KIN(後)
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

export function dateToKin(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const day = date.getDate()

  // うるう年の補正も 2/29 の特別扱いも入れない。非うるう年の月テーブルのまま計算すると
  // 2/29 は 3/1 と同じ値になり、それが mayadan.jp の返す値と一致する(ファイル冒頭参照)。
  const janValue = mod(REFERENCE_JAN_VALUE - 1 + YEAR_STEP * (year - REFERENCE_YEAR), 260) + 1
  const monthValue = mod(janValue - 1 + CUMULATIVE_DAYS_BEFORE_MONTH[month], 260) + 1

  return mod(monthValue + day - 1, 260) + 1
}

export function kinInfo(kin: number): KinInfo {
  const sealIndex = (kin - 1) % 20
  const toneIndex = (kin - 1) % 13
  const wavespellKin = kin - toneIndex
  const wavespellSealIndex = ((wavespellKin - 1) % 20 + 20) % 20
  const antipodeSealIndex = (sealIndex + 10) % 20
  const mysticSealIndex = 19 - sealIndex
  const analogSealIndex = mod(17 - sealIndex, 20)
  const guideSealIndex = (sealIndex + GUIDE_OFFSETS[toneIndex % 5]) % 20
  const mirrorKin = 261 - kin
  const absoluteOppositeKin = mod(kin - 1 + 130, 260) + 1
  const prevKin = mod(kin - 2, 260) + 1
  const nextKin = mod(kin, 260) + 1
  return {
    kin,
    sealIndex,
    toneIndex,
    wavespellSealIndex,
    antipodeSealIndex,
    mysticSealIndex,
    analogSealIndex,
    guideSealIndex,
    mirrorKin,
    absoluteOppositeKin,
    prevKin,
    nextKin
  }
}

// KIN N の「KINの関係性」4つの紋章(ガイド/神秘/反対/類似)。重複しうる(音1・6・11ではガイドが
// 自分の紋章と同じになる)ので、役割ではなく「集合に含まれるか」で判定に使うこと。
// pages/kin/[sealIndex].vue が ?from=N を検証するのに使う — 記事(KIN N)の単体購入で、
// そのKINのページから開いた関係性ページも読めるようにするため(決済導入後)。
export function relationSealIndices(kin: number): number[] {
  const info = kinInfo(kin)
  return [info.guideSealIndex, info.mysticSealIndex, info.antipodeSealIndex, info.analogSealIndex]
}

// KIN N の「運命数字」5つのKIN(同じ/前/次/鏡の向こうの自分/絶対反対KIN)。「同じKIN」は N 自身。
// pages/kin/[kin]/detail.vue が ?from=N を検証するのに使う(relationSealIndices と同じ目的)。
export function destinyKins(kin: number): number[] {
  const info = kinInfo(kin)
  return [info.kin, info.prevKin, info.nextKin, info.mirrorKin, info.absoluteOppositeKin]
}

// KIN番号として正しい整数(1–260)なら数値を、そうでなければ null を返す。クエリの検証用。
export function parseKin(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= 260 ? n : null
}

export function diagnoseBirthdate(birthdate: string, today: Date = new Date()) {
  const parsed = birthdate ? new Date(birthdate) : new Date(1992, 9, 16)
  const birth = kinInfo(dateToKin(parsed))
  const now = kinInfo(dateToKin(today))
  return { birth, now, parsedBirthdate: parsed }
}
