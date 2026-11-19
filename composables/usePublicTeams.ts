import { collection, getDocs, query, where, type Firestore } from 'firebase/firestore'

// 紹介コード付き会員登録(pages/signup/referral.vue)と /account のチーム選択プルダウン用の
// チーム一覧。publicTeams は { name, active } だけの公開コピーで、管理画面のチーム操作と
// 同じバッチで更新されている(utils/referralTeamAdmin.ts)。コードの無効なチームは出さない。
//
// where は単一フィールドなので自動インデックスで動く。並べ替えはクライアント側で行う
// (orderBy を足すと複合インデックスの手動作成が必要になるため)。

export interface PublicTeam {
  id: string
  name: string
  // 選んだら自動で入れる紹介コード(管理画面で「登録画面のチーム選択に出す」にしたチームだけ持つ)
  code: string
}

// 「その他」の選択肢の値。選んだら紹介コードを手入力し、コードからチームを決める(2026-11-19)。
export const OTHER_TEAM_ID = '__other__'

export function usePublicTeams() {
  const { $firestore } = useNuxtApp()
  const { data, pending, error } = useAsyncData(
    'public-teams',
    async (): Promise<PublicTeam[]> => {
      const snap = await getDocs(query(collection($firestore as Firestore, 'publicTeams'), where('active', '==', true)))
      // 選択肢に出すのは listed のチームだけ(それ以外は「その他」+ コード入力で入る)
      return snap.docs
        .map((d) => {
          const data = d.data() as { name?: string; listed?: boolean; code?: string | null }
          return { id: d.id, name: data.name ?? '', code: data.listed && data.code ? data.code : '' }
        })
        .filter((t) => t.name && t.code)
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    },
    { server: false, lazy: true, default: () => [] }
  )
  return { teams: data, pending, error }
}
