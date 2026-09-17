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
}

export function usePublicTeams() {
  const { $firestore } = useNuxtApp()
  const { data, pending, error } = useAsyncData(
    'public-teams',
    async (): Promise<PublicTeam[]> => {
      const snap = await getDocs(query(collection($firestore as Firestore, 'publicTeams'), where('active', '==', true)))
      return snap.docs
        .map((d) => ({ id: d.id, name: (d.data() as { name?: string }).name ?? '' }))
        .filter((t) => t.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'ja'))
    },
    { server: false, lazy: true, default: () => [] }
  )
  return { teams: data, pending, error }
}
