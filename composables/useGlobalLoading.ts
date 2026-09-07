// 画面全体を覆うローディングの表示状態。Firestore/Firebase Auth との通信のうち、
// 利用者が操作してから結果を待つもの(会員登録・ログイン・コード登録・管理画面の保存など)
// を対象にする。
//
// 真偽値ではなく件数で持つのは、複数の処理が同時に走ったときに、先に終わった片方が
// ローディングを消してしまうのを防ぐため。
//
// 画面表示時の読み込み(診断コンテンツの取得など)はここでは扱わない。無料部分は先に
// 描画されるので、全画面で覆うとかえって待たされている印象が強くなる — そちらは
// 各ページの「読み込み中…」表示のままにしている。
const pending = ref(0)

// 覆ったまま戻らなくなるのを防ぐ上限。Firestoreはオフライン時に書き込みを無限に
// リトライするため、await が永久に返らないことがあり得る。そのまま操作不能に
// なるくらいなら、覆いを外して利用者が操作を諦められる状態にする方がよい。
// (処理自体は裏で続く。エラー表示は各ページの catch に任せる)
const MAX_LOADING_MS = 20000

export function useGlobalLoading() {
  const active = computed(() => pending.value > 0)

  // 処理を包むだけで表示/非表示が対になる。途中で例外が出ても finally で必ず戻すので、
  // 画面が覆われたまま操作不能になることがない。
  async function withLoading<T>(fn: () => Promise<T>): Promise<T> {
    pending.value++
    const guard = setTimeout(() => {
      if (pending.value > 0) pending.value--
    }, MAX_LOADING_MS)
    try {
      return await fn()
    } finally {
      clearTimeout(guard)
      // 上の安全弁が先に減らしていた場合に負数へ回り込まないようにする。
      if (pending.value > 0) pending.value--
    }
  }

  return { active, withLoading }
}
