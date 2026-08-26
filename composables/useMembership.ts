export type MembershipPlan = 'free' | 'paid'

export const PLAN_RANK: Record<MembershipPlan, number> = { free: 0, paid: 1 }

export interface PlanInfo {
  id: MembershipPlan
  name: string
  price: string
  desc: string
}

export const PLAN_META: PlanInfo[] = [
  { id: 'paid', name: '有料プラン', price: '¥550', desc: '紋章プロフィールの続きまで、すべて閲覧可能' }
]

const ALL_PLANS: MembershipPlan[] = ['free', 'paid']
const STORAGE_KEY = 'maya-demo-plan'

export function useMembership() {
  const plan = useState<MembershipPlan>('membership-plan', () => 'free')
  const rank = computed(() => PLAN_RANK[plan.value])

  function setPlan(next: MembershipPlan) {
    plan.value = next
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, next)
  }

  function hydrate() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY) as MembershipPlan | null
    if (saved && ALL_PLANS.includes(saved)) plan.value = saved
  }

  return { plan, rank, setPlan, hydrate }
}
