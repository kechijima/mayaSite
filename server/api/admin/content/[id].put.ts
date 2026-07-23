import { FieldValue } from 'firebase-admin/firestore'

const ID_PATTERN = /^(sun|wavespell|tone)-(\d+)$/
const MAX_INDEX: Record<string, number> = { sun: 19, wavespell: 19, tone: 12 }
const STATUSES = ['公開', '下書き']

// Protected by server/middleware/admin-auth.ts — event.context.admin is
// guaranteed set by the time this handler runs.
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const match = id.match(ID_PATTERN)
  if (!match) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content id' })
  }

  const [, type, indexStr] = match
  const index = Number(indexStr)
  if (index > MAX_INDEX[type]) {
    throw createError({ statusCode: 400, statusMessage: 'Index out of range' })
  }

  const body = await readBody(event)
  const freeText = body?.freeText
  const premiumText = body?.premiumText ?? ''
  const status = body?.status

  if (typeof freeText !== 'string' || typeof premiumText !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'freeText/premiumText must be strings' })
  }
  if (!STATUSES.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'status must be 公開 or 下書き' })
  }

  try {
    await getAdminDb().collection('diagnosisContent').doc(id).set(
      { freeText, premiumText, status, updatedAt: FieldValue.serverTimestamp(), updatedBy: event.context.admin?.uid ?? null },
      { merge: true }
    )
    return { ok: true, id }
  } catch (error) {
    throw createError({ statusCode: 500, statusMessage: error instanceof Error ? error.message : 'Failed to save content' })
  }
})
