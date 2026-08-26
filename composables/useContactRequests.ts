import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore'
import type { Gender } from '~/utils/gender'

export interface ContactRequestDoc {
  name: string
  gender: Gender
  phone: string
  email: string
  createdAt: unknown // serverTimestamp() sentinel on write; a Firestore Timestamp once read back
}

// 有料化導線(pages/checkout.vue): 決済が未実装のため、申し込みボタン押下後に連絡先を
// 集めて後追いする。診断履歴(useDiagnosisHistory)と違い、送信結果をユーザーへの案内表示に
// 使うため fire-and-forget にはせず、呼び出し側が await してエラーを扱う。
export function useContactRequests() {
  const { $firestore } = useNuxtApp()

  async function submitContactRequest(input: { name: string; gender: Gender; phone: string; email: string }) {
    const doc = {
      name: input.name,
      gender: input.gender,
      phone: input.phone,
      email: input.email,
      createdAt: serverTimestamp()
    }
    await addDoc(collection($firestore as Firestore, 'contactRequests'), doc)
  }

  return { submitContactRequest }
}
