// Tzolkin (260-day sacred calendar) KIN calculator, matching the "KIN早見表"
// (quick-reference table) method used by mainstream Japanese マヤ暦占い sites
// — e.g. https://unkoi.com/special/mayareki/ — rather than a Dreamspell/GMT
// astronomical correlation. This table method advances the KIN base by
// exactly 365 days per calendar year (never 366, even across real leap
// years), then applies an isolated +1 correction only for people born in
// **March** (1st–31st) of a leap year — not March through December; the
// source site is explicit that this +1 is scoped to that single month
// ("誕生日がうるう年の3月1日～3月31日の人の場合"), and its printed table
// marks only the March column with "*" in leap-year rows. A `month >= 2`
// (March onward) condition was shipped here initially and silently
// over-applied the +1 to every leap-year birthday from April through
// December (e.g. 1992-10-04 computed as KIN110 instead of the correct
// KIN109) — the one leap-year example used to verify this file at the time,
// 1964-03-05, was itself a March date, so both the correct rule and the
// wrong one agreed on it and the bug went unnoticed until a later leap-year,
// non-March birthdate surfaced it.
// It is NOT a continuous real-day count — verified byte-for-byte against
// unkoi.com's published 早見表 grid (216 cells, year/month → base value)
// and all 3 of their worked examples (2014-02-05→KIN98, 1966-02-20→KIN13,
// 1964-03-05→KIN77) before being encoded here.
const REFERENCE_YEAR = 1910
const REFERENCE_JAN_VALUE = 62 // table's base value for January of 1910 (and every +52-year multiple)
const YEAR_STEP = 105 // 365 mod 260 — constant per calendar year, leap years included
const CUMULATIVE_DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334] // non-leap, Jan–Dec

export interface KinInfo {
  kin: number // 1-260
  sealIndex: number // 0-19
  toneIndex: number // 0-12 (tone number = toneIndex + 1)
  wavespellSealIndex: number // 0-19, seal that opens the current 13-day wavespell
  occultSealIndex: number // 0-19, simplified "hidden power" counterpart seal
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function dateToKin(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() // 0-11
  const day = date.getDate()

  const janValue = mod(REFERENCE_JAN_VALUE - 1 + YEAR_STEP * (year - REFERENCE_YEAR), 260) + 1
  const monthValue = mod(janValue - 1 + CUMULATIVE_DAYS_BEFORE_MONTH[month], 260) + 1

  let kin = monthValue + day
  if (isLeapYear(year) && month === 2) kin += 1 // March only (month index 2), not March–December
  if (kin > 260) kin -= 260
  return kin
}

export function kinInfo(kin: number): KinInfo {
  const sealIndex = (kin - 1) % 20
  const toneIndex = (kin - 1) % 13
  const wavespellKin = kin - toneIndex
  const wavespellSealIndex = ((wavespellKin - 1) % 20 + 20) % 20
  const occultSealIndex = (sealIndex + 10) % 20
  return { kin, sealIndex, toneIndex, wavespellSealIndex, occultSealIndex }
}

export function diagnoseBirthdate(birthdate: string, today: Date = new Date()) {
  const parsed = birthdate ? new Date(birthdate) : new Date(1992, 9, 16)
  const birth = kinInfo(dateToKin(parsed))
  const now = kinInfo(dateToKin(today))
  return { birth, now, parsedBirthdate: parsed }
}
