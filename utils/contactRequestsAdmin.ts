import type { ContactRequestDoc } from '~/composables/useContactRequests'
import { genderLabel } from '~/utils/gender'

export interface ContactRequestRow {
  id: string
  name: string
  gender: string
  phone: string
  email: string
  createdAt: Date | null
}

export function buildContactRequestRow(id: string, data: ContactRequestDoc): ContactRequestRow {
  const createdAtValue = data.createdAt as { toDate?: () => Date } | undefined
  return {
    id,
    name: data.name,
    gender: genderLabel(data.gender),
    phone: data.phone,
    email: data.email,
    createdAt: createdAtValue?.toDate ? createdAtValue.toDate() : null
  }
}
