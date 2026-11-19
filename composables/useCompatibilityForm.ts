import { MAX_OTHER_PEOPLE, type PersonInput } from '~/composables/useCompatibility'
import { DEFAULT_GENDER } from '~/utils/gender'

// 相性診断の入力フォームの中身。/compatibility と /compatibility/result を行き来しても残るよう
// useState(アプリ全体で1つ)に置く。再読み込みで消えるのは許容(入力を端末に保存しない)。
export interface CompatibilityFormState {
  self: PersonInput
  others: PersonInput[]
  // 相手の枠の id 採番。v-for の key に使うので、削除→追加しても重ならないよう増やし続ける
  nextOtherId: number
}

export function makeCompatibilityOther(state: CompatibilityFormState): PersonInput {
  return { id: `other-${state.nextOtherId++}`, name: '', birthdate: '', gender: DEFAULT_GENDER }
}

export function useCompatibilityForm() {
  return useState<CompatibilityFormState>('compatibility-form', () => {
    const state: CompatibilityFormState = {
      self: { id: 'self', name: '', birthdate: '', gender: DEFAULT_GENDER },
      others: [],
      nextOtherId: 0
    }
    // 最初から上限(6人)ぶんの枠を並べておく — 「追加」を押させてから入力させるより、
    // 何人まで登録できるのかが一目で分かり、複数人を続けて入力するときの操作も減る。
    state.others = Array.from({ length: MAX_OTHER_PEOPLE }, () => makeCompatibilityOther(state))
    return state
  })
}
