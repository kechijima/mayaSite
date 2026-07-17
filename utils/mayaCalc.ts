// Simplified Tzolkin (260-day sacred calendar) calculator for demo purposes.
// Uses 1987-08-16 = KIN 1 (Red Dragon, tone 1) as the correlation anchor,
// the date widely published as the start of the modern Dreamspell count.
// This is not a certified/authoritative correlation — good enough for a
// demo diagnosis, worth revisiting if exact traditional accuracy matters.
const EPOCH_KIN_1 = Date.UTC(1987, 7, 16)
const DAY_MS = 86_400_000

export interface KinInfo {
  kin: number // 1-260
  sealIndex: number // 0-19
  toneIndex: number // 0-12 (tone number = toneIndex + 1)
  wavespellSealIndex: number // 0-19, seal that opens the current 13-day wavespell
  occultSealIndex: number // 0-19, simplified "hidden power" counterpart seal
}

export function dateToKin(date: Date): number {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const daysDiff = Math.floor((utcMidnight - EPOCH_KIN_1) / DAY_MS)
  return (((daysDiff % 260) + 260) % 260) + 1
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
