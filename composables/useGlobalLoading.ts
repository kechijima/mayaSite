// 画面全体を覆うローディングの表示状態。Firestore/Firebase Auth との通信のうち、
// 利用者が操作してから結果を待つもの(会員登録・ログイン・コード登録・管理画面の保存など)
// を対象にする。
//
// 真偽値ではなく件数で持つのは、複数の処理が同時に走ったときに、先に終わった片方が
// ローディングを消してしまうのを防ぐため。
//
// 画面表示時の読み込みは原則ここでは扱わない。無料部分は先に描画されるので、全画面で覆うと
// かえって待たされている印象が強くなる — そちらは各ページの「読み込み中…」表示のままにする。
// 例外は診断結果ページで、そこだけは本文と画像が揃うまで覆う(RESULT_LOADING_KEY)。
const pending = ref(0)

// 画面をまたぐ待ちはキーで持つ。withLoading は「呼んだ関数が終わるまで」で対になるが、
// 「トップで診断ボタンを押してから /result で画像が出揃うまで」のように開始と終了が別の
// コンポーネントになるものは、await で包めないため名前で開け閉めする。
// 同じキーで二重に開始しても1つとして扱うので、遷移元が開始済みかどうかを遷移先が
// 気にしなくてよい(直接URLを開かれた場合も遷移先の開始だけで成立する)。
const waiting = ref<string[]>([])
const waitingGuards = new Map<string, ReturnType<typeof setTimeout>>()

/** トップの「無料で診断する」→ /result の本文・画像が出揃うまで。 */
export const RESULT_LOADING_KEY = 'result'

// 覆ったまま戻らなくなるのを防ぐ上限。Firestoreはオフライン時に書き込みを無限に
// リトライするため、await が永久に返らないことがあり得る。そのまま操作不能に
// なるくらいなら、覆いを外して利用者が操作を諦められる状態にする方がよい。
// (処理自体は裏で続く。エラー表示は各ページの catch に任せる)
const MAX_LOADING_MS = 20000

export function useGlobalLoading() {
  const active = computed(() => pending.value > 0 || waiting.value.length > 0)

  // 開始と終了が別の場所になる待ちを開ける。既に同じキーが開いていれば何もしない。
  function beginLoading(key: string) {
    if (waiting.value.includes(key)) return
    waiting.value = [...waiting.value, key]
    // withLoading と同じ安全弁。終了側が呼ばれないまま画面が覆われ続けるのを防ぐ。
    waitingGuards.set(key, setTimeout(() => endLoading(key), MAX_LOADING_MS))
  }

  // 何度呼んでも安全。画面を離れるときにも呼ぶため、開いていない場合は無視する。
  function endLoading(key: string) {
    const guard = waitingGuards.get(key)
    if (guard) {
      clearTimeout(guard)
      waitingGuards.delete(key)
    }
    if (waiting.value.includes(key)) waiting.value = waiting.value.filter((k) => k !== key)
  }

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

  return { active, withLoading, beginLoading, endLoading }
}
