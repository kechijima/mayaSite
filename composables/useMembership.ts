export type MembershipPlan = 'free' | 'light' | 'standard' | 'premium'

export const PLAN_RANK: Record<MembershipPlan, number> = { free: 0, light: 1, standard: 2, premium: 3 }

export interface PlanInfo {
  id: MembershipPlan
  name: string
  price: string
  desc: string
}

export const PLAN_META: PlanInfo[] = [
  { id: 'light', name: 'ライト', price: '¥480', desc: 'デイサインまで閲覧可能' },
  { id: 'standard', name: 'スタンダード', price: '¥980', desc: 'デイサイン・トレセーナまで閲覧可能' },
  { id: 'premium', name: 'プレミアム', price: '¥1,980', desc: '古代マヤ暦全書まで、すべて閲覧可能' }
]

const ALL_PLANS: MembershipPlan[] = ['free', 'light', 'standard', 'premium']
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
