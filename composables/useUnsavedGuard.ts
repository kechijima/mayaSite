// 管理画面の編集フォームで、未保存の変更があるまま離れようとしたら確認を出す。
// 同じページ内の切り替え(?tab / ?seal などクエリの変更)、別ページへの移動、タブを閉じる・再読み込みの3つ。
// 呼んだコンポーネントがマウントされている間だけ効く。
export const UNSAVED_MESSAGE = '保存していない変更があります。破棄して移動しますか？'

export function useUnsavedGuard(dirty: Ref<boolean> | ComputedRef<boolean>) {
  const ask = () => (dirty.value ? window.confirm(UNSAVED_MESSAGE) : true)
  onBeforeRouteUpdate(ask)
  onBeforeRouteLeave(ask)
  function onBeforeUnload(e: BeforeUnloadEvent) {
    if (dirty.value) e.preventDefault()
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
}
