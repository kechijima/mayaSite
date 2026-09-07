<script setup lang="ts">
import { doc, getDoc, type Firestore } from 'firebase/firestore'
import {
  MEMBER_LIST_LIMIT,
  addMember,
  fetchCodeStatus,
  fetchMembers,
  findUserByEmail,
  removeMember,
  renameTeam,
  setCodeStatus,
  updateNote,
  type ReferralTeam,
  type TeamMember
} from '~/utils/referralTeamAdmin'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const teamId = route.params.teamId as string

const team = ref<ReferralTeam | null>(null)
const status = ref<'active' | 'disabled' | 'missing'>('missing')
const members = ref<TeamMember[]>([])
const loading = ref(true)
const notFound = ref(false)
const loadError = ref('')
const actionError = ref('')

const draftName = ref('')
const draftNote = ref('')
const savingMeta = ref(false)
const savedMeta = ref(false)

const addEmail = ref('')
const addCandidate = ref<Awaited<ReturnType<typeof findUserByEmail>>>(null)
const addSearched = ref(false)
const addBusy = ref(false)

// 「外す」は閲覧権限を失わせる操作なので、確認を挟んでから実行する。
const removeTarget = ref<TeamMember | null>(null)

const { withLoading } = useGlobalLoading()

function firestore() {
  const { $firestore } = useNuxtApp()
  return $firestore as Firestore
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const db = firestore()
    const snap = await getDoc(doc(db, 'referralTeams', teamId))
    if (!snap.exists()) {
      notFound.value = true
      return
    }
    const data = { id: snap.id, ...(snap.data() as Omit<ReferralTeam, 'id'>) }
    team.value = data
    draftName.value = data.name
    draftNote.value = data.note ?? ''
    const [code, list] = await Promise.all([fetchCodeStatus(db, data.code), fetchMembers(db, teamId)])
    status.value = code?.status ?? 'missing'
    members.value = list
  } catch {
    loadError.value = 'チームの読み込みに失敗しました。時間をおいて再度お試しください。'
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function toggleStatus() {
  if (!team.value || status.value === 'missing') return
  actionError.value = ''
  const next = status.value === 'active' ? 'disabled' : 'active'
  try {
    await withLoading(() => setCodeStatus(firestore(), team.value!.code, next))
    status.value = next
  } catch {
    actionError.value = 'コードの状態を変更できませんでした。'
  }
}

async function saveMeta() {
  if (!team.value || savingMeta.value) return
  savingMeta.value = true
  savedMeta.value = false
  actionError.value = ''
  try {
    const db = firestore()
    const name = draftName.value.trim()
    // チーム名は referralCodes と各メンバーの users にも複製されているので、
    // 変更時は3か所を揃える(utils/referralTeamAdmin.ts の renameTeam)。
    // 改称はチーム・コード・全メンバーの3か所を書き換えるため、メンバー数によっては時間がかかる。
    await withLoading(async () => {
      if (name && name !== team.value!.name) await renameTeam(db, team.value!, name)
      if (draftNote.value !== (team.value!.note ?? '')) await updateNote(db, teamId, draftNote.value)
    })
    savedMeta.value = true
    await withLoading(load)
  } catch {
    actionError.value = '保存に失敗しました。時間をおいて再度お試しください。'
  } finally {
    savingMeta.value = false
  }
}

async function searchUser() {
  if (!addEmail.value.trim()) return
  addBusy.value = true
  addSearched.value = false
  actionError.value = ''
  try {
    addCandidate.value = await withLoading(() => findUserByEmail(firestore(), addEmail.value))
    addSearched.value = true
  } catch {
    actionError.value = '会員の検索に失敗しました。'
  } finally {
    addBusy.value = false
  }
}

async function confirmAdd() {
  if (!addCandidate.value || !team.value || addBusy.value) return
  addBusy.value = true
  actionError.value = ''
  try {
    await withLoading(() => addMember(firestore(), addCandidate.value!.uid, teamId, team.value!.name))
    addEmail.value = ''
    addCandidate.value = null
    addSearched.value = false
    await withLoading(load)
  } catch {
    actionError.value = '追加に失敗しました。時間をおいて再度お試しください。'
  } finally {
    addBusy.value = false
  }
}

async function confirmRemove() {
  if (!removeTarget.value) return
  const target = removeTarget.value
  removeTarget.value = null
  actionError.value = ''
  try {
    await withLoading(() => removeMember(firestore(), target.uid))
    await withLoading(load)
  } catch {
    actionError.value = '除外に失敗しました。時間をおいて再度お試しください。'
  }
}

function formatDate(ts: TeamMember['joinedAt']) {
  const d = ts?.toDate()
  if (!d) return '—'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function sourceLabel(source: TeamMember['entitlementSource']) {
  return source === 'admin' ? '管理者追加' : source === 'code' ? 'コード入力' : '—'
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/teams" class="mb-4 inline-block text-xs font-semibold text-brass-700 hover:underline dark:text-gold-300">‹ チーム管理に戻る</NuxtLink>

    <div v-if="notFound" class="rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      指定されたチームが見つかりませんでした。
    </div>

    <p v-else-if="loading" class="py-6 text-center text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>

    <template v-else-if="team">
      <div class="mb-6">
        <h1 class="text-xl font-bold">{{ team.name }}</h1>
        <span class="text-xs text-slate-500 dark:text-slate-400">チームID: {{ team.id }}</span>
      </div>

      <div v-if="loadError || actionError" class="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        {{ loadError || actionError }}
      </div>

      <!-- コード -->
      <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-3 text-sm font-bold">紹介コード</p>
        <div class="flex flex-wrap items-center gap-3">
          <code class="rounded bg-slate-50 px-3 py-1.5 font-mono text-lg font-bold tracking-[.08em] dark:bg-slate-800">{{ team.code }}</code>
          <CopyIconButton :value="team.code" />
          <span
            class="rounded-full px-2.5 py-0.5 text-[11.5px] font-bold"
            :class="status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'"
          >{{ status === 'active' ? '有効' : '無効' }}</span>
          <button
            v-if="status !== 'missing'"
            type="button"
            class="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold dark:border-slate-700"
            @click="toggleStatus"
          >
            {{ status === 'active' ? '無効にする' : '有効に戻す' }}
          </button>
        </div>
        <p class="mt-2.5 text-[11.5px] text-slate-500 dark:text-slate-400">
          無効にすると、以降このコードで新規登録できなくなります。<strong>既にメンバーの{{ members.length }}名の閲覧権限はそのまま維持されます。</strong>
        </p>
      </div>

      <!-- チーム情報 -->
      <div class="mb-4 rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <p class="mb-3 text-sm font-bold">チーム情報</p>
        <div class="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">チーム名</label>
            <input v-model="draftName" type="text" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label class="mb-1 block text-xs text-slate-500 dark:text-slate-400">メモ（管理者のみ・会員には表示されません）</label>
            <input v-model="draftNote" type="text" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" class="rounded-lg bg-brass-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="savingMeta" @click="saveMeta">
            {{ savingMeta ? '保存中…' : '保存する' }}
          </button>
          <span v-if="savedMeta" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400">保存しました</span>
        </div>
      </div>

      <!-- メンバー -->
      <div class="rounded-xl border border-slate-200 bg-white p-5.5 dark:border-slate-800 dark:bg-slate-900">
        <div class="mb-3 flex items-baseline justify-between">
          <p class="text-sm font-bold">メンバー（{{ members.length }}名）</p>
          <span v-if="members.length >= MEMBER_LIST_LIMIT" class="text-[11px] text-slate-500 dark:text-slate-400">先頭{{ MEMBER_LIST_LIMIT }}名のみ表示</span>
        </div>

        <!-- 追加 -->
        <div class="mb-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <p class="mb-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            会員をこのチームに追加（コードを渡さずに閲覧権限を付与します）
          </p>
          <form class="flex flex-wrap gap-2.5" @submit.prevent="searchUser">
            <input
              v-model="addEmail"
              type="email"
              placeholder="メールアドレス（完全一致）"
              class="min-w-[240px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <button type="submit" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold disabled:opacity-50 dark:border-slate-700" :disabled="addBusy || !addEmail.trim()">
              検索
            </button>
          </form>

          <div v-if="addSearched && !addCandidate" class="mt-2.5 text-xs text-slate-500 dark:text-slate-400">
            このメールアドレスの会員は見つかりませんでした。会員登録が済んでいるかご確認ください。
          </div>
          <div v-else-if="addCandidate" class="mt-2.5 flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800">
            <div class="text-[13px]">
              <span class="font-semibold">{{ addCandidate.name || '（氏名未登録）' }}</span>
              <span class="ml-2 text-slate-500 dark:text-slate-400">{{ addCandidate.email }}</span>
            </div>
            <span v-if="addCandidate.teamId === teamId" class="text-xs text-slate-500 dark:text-slate-400">既にこのチームのメンバーです</span>
            <span v-else-if="addCandidate.teamId" class="text-xs font-semibold text-amber-700 dark:text-amber-400">
              現在「{{ addCandidate.teamName || addCandidate.teamId }}」に所属しています。追加すると所属が移ります。
            </span>
            <button
              v-if="addCandidate.teamId !== teamId"
              type="button"
              class="ml-auto rounded-lg bg-brass-700 px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              :disabled="addBusy"
              @click="confirmAdd"
            >
              このチームに追加
            </button>
          </div>
        </div>

        <p v-if="!members.length" class="py-3 text-center text-sm text-slate-500 dark:text-slate-400">まだメンバーがいません。</p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-[13px]">
            <thead>
              <tr class="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <th class="pb-2.5 pr-3">氏名</th>
                <th class="pb-2.5 pr-3">メール</th>
                <th class="pb-2.5 pr-3">所属経路</th>
                <th class="pb-2.5 pr-3">所属日</th>
                <th class="pb-2.5"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in members" :key="m.uid" class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                <td class="py-2.5 pr-3">{{ m.name || '—' }}</td>
                <td class="py-2.5 pr-3 text-slate-500 dark:text-slate-400">{{ m.email }}</td>
                <td class="py-2.5 pr-3">{{ sourceLabel(m.entitlementSource) }}</td>
                <td class="py-2.5 pr-3 tabular-nums text-slate-500 dark:text-slate-400">{{ formatDate(m.joinedAt) }}</td>
                <td class="py-2.5">
                  <button type="button" class="text-xs font-semibold text-red-600 hover:underline dark:text-red-400" @click="removeTarget = m">外す</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 除外の確認 -->
      <div v-if="removeTarget" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" @click.self="removeTarget = null">
        <div class="w-full max-w-[440px] rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 class="mb-3 text-base font-bold">{{ removeTarget.name || removeTarget.email }} をチームから外しますか？</h2>
          <p class="mb-5 text-[13px] leading-[1.8] text-slate-600 dark:text-slate-300">
            この会員は<strong>有料エリアを閲覧できなくなります</strong>。
            ただし紹介コードをご存じの場合は、本人がマイページから入力し直して再び所属できます。
            確実に閲覧させたくない場合は、あわせてこのチームのコードを無効にしてください。
          </p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700" @click="removeTarget = null">やめる</button>
            <button type="button" class="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white" @click="confirmRemove">外す</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
