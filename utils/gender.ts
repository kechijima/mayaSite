export type Gender = 'male' | 'female'

export const DEFAULT_GENDER: Gender = 'female'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' }
]

export function genderLabel(gender: Gender): string {
  return GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? genderLabel(DEFAULT_GENDER)
}

export function isGender(value: string): value is Gender {
  return GENDER_OPTIONS.some((g) => g.value === value)
}
