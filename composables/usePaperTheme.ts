export type PaperVariant = 'beige' | 'white'

const ALL_VARIANTS: PaperVariant[] = ['beige', 'white']
const STORAGE_KEY = 'maya-demo-paper'

export function usePaperTheme() {
  const paper = useState<PaperVariant>('paper-theme', () => 'beige')

  function setPaper(next: PaperVariant) {
    paper.value = next
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, next)
  }

  function hydrate() {
    if (!import.meta.client) return
    const saved = localStorage.getItem(STORAGE_KEY) as PaperVariant | null
    if (saved && ALL_VARIANTS.includes(saved)) paper.value = saved
  }

  return { paper, setPaper, hydrate }
}
