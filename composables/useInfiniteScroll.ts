// 一覧の末尾に置いた番兵要素が画面に近づいたら loadMore() を呼ぶ(無限スクロール)。
// 管理画面のカード一覧(lg 未満)で使う。PC のテーブル側は従来どおりページ送り/全件表示で、
// 番兵は `lg:hidden` の <ul> の中に置くので、PC では display:none になり交差しない = 何も起きない。
//
// 使い方:
//   const { sentinel } = useInfiniteScroll({ hasMore: () => ..., loadMore: async () => ... })
//   <li ref="sentinel" />
//
// 読み込んでも番兵がまだ画面内に残っている(1回分の追加では画面が埋まらない)場合は、
// IntersectionObserver は再発火しないので、DOM 更新後に位置を見直して続けて読み込む。
// 画面下端からこの距離に番兵が入ったら先読みする
const MARGIN_PX = 400

// スマホのカード一覧で一度に出す/継ぎ足す件数。PC のテーブルはページ送り 100 件・全件表示のまま。
export const ADMIN_MOBILE_PAGE_SIZE = 20

export function useInfiniteScroll(options: { hasMore: () => boolean; loadMore: () => void | Promise<void> }) {
  const sentinel = ref<HTMLElement | null>(null)
  let observer: IntersectionObserver | null = null
  let busy = false

  function inView() {
    const el = sentinel.value
    if (!el || !el.offsetParent) return false // display:none(PC)なら常に false
    const rect = el.getBoundingClientRect()
    return rect.top < window.innerHeight + MARGIN_PX
  }

  async function fill() {
    if (busy) return
    busy = true
    try {
      while (options.hasMore() && inView()) {
        await options.loadMore()
        await nextTick()
      }
    } finally {
      busy = false
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fill()
      },
      { rootMargin: `${MARGIN_PX}px 0px` }
    )
    watch(
      sentinel,
      (el, old) => {
        if (old) observer?.unobserve(old)
        if (el) observer?.observe(el)
      },
      { immediate: true }
    )
  })
  onBeforeUnmount(() => observer?.disconnect())

  // 絞り込みで一覧が短くなった直後など、スクロールせずに番兵が見えている状態から
  // 呼び直したいときのために公開しておく。
  return { sentinel, fill }
}
