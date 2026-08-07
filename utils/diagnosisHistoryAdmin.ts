import type { CompatibilityHistoryDoc, PersonSummary, SingleHistoryDoc } from '~/composables/useDiagnosisHistory'
import { genderLabel } from '~/utils/gender'

export type HistoryDoc = SingleHistoryDoc | CompatibilityHistoryDoc
export type HistoryType = HistoryDoc['type']

export interface HistoryRow {
  id: string
  type: HistoryType
  primaryName: string
  birthdate: string
  gender: string
  sealName: string
  createdAt: Date | null
  people: PersonSummary[] // [person] for 'single'; [self, ...others] for 'compatibility'
}

export function historyTypeLabel(type: HistoryType) {
  return type === 'single' ? '通常診断' : '相性診断'
}

export function historyTypeChipClass(type: HistoryType) {
  return type === 'single'
    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
}

export function buildHistoryRow(id: string, data: HistoryDoc): HistoryRow {
  const createdAtValue = data.createdAt as { toDate?: () => Date } | undefined
  const createdAt = createdAtValue?.toDate ? createdAtValue.toDate() : null

  if (data.type === 'single') {
    const p = data.person
    return {
      id,
      type: 'single',
      primaryName: p.name,
      birthdate: p.birthdate,
      gender: genderLabel(p.gender),
      sealName: p.sealName,
      createdAt,
      people: [p]
    }
  }

  const primaryName = data.others.length ? `${data.self.name} 他${data.others.length}人` : data.self.name
  return {
    id,
    type: 'compatibility',
    primaryName,
    birthdate: data.self.birthdate,
    gender: genderLabel(data.self.gender),
    sealName: data.self.sealName,
    createdAt,
    people: [data.self, ...data.others]
  }
}

export function formatDateTime(d: Date | null) {
  if (!d) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
