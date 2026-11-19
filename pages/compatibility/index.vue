<script setup lang="ts">
import { MAX_OTHER_PEOPLE } from '~/composables/useCompatibility'
import { DEFAULT_BIRTHDATE } from '~/utils/birthdate'
import { encodePerson } from '~/utils/compatibilityQuery'

// 2026-09-17: 診断結果ページからの遷移時に名前・生年月日・性別を自動入力していたのをやめた
// (要望による)。入力欄は空で始まる。
// 2026-11-19: 結果を /compatibility/result に分けた。入力は useState に置き、結果から「戻る」
// (ブラウザの戻る・「入力内容を変えて診断する」)で戻ったときに全員ぶん残るようにしている。
// SPA 内の遷移なら残り、再読み込みすると空に戻る。
const form = useCompatibilityForm()
const self = toRef(form.value, 'self')
const others = toRef(form.value, 'others')
const makeOther = () => makeCompatibilityOther(form.value)

const canAddMore = computed(() => others.value.length < MAX_OTHER_PEOPLE)
function addPerson() {
  if (canAddMore.value) others.value.push(makeOther())
}
function removePerson(id: string) {
  others.value = others.value.filter((p) => p.id !== id)
}

// 手つかずの枠を診断対象から外す。6枠を最初から並べている以上これが無いと、使っていない枠まで
// 「1985年生まれの誰か」として結果に並んでしまう。
// BirthdateSelectは表示された時点で既定値(DEFAULT_BIRTHDATE)を必ず入れてしまい空にならないので、
// 「生年月日が入っているか」では判定できない。代わりに「名前を入れた or 生年月日を既定値から
// 動かした」を"その枠を使った"の合図とみなす。
// 制約: 名前を空のまま、生年月日もちょうど既定値のままにしたい人(=1985年1月1日生まれで匿名)は
// 対象にできない。その場合は名前を1文字でも入れてもらう必要がある。
const usedOthers = computed(() =>
  others.value.filter((p) => p.name.trim() !== '' || (!!p.birthdate && p.birthdate !== DEFAULT_BIRTHDATE))
)
const canSubmit = computed(() => usedOthers.value.length > 0)

// 名前が未入力の人には、登場順にA・B・C…を割り当てる(全員まとめて「ゲスト」になると、
// 複数人いるときに結果のどれが誰か分からなくなるため)。名前を入れた人は飛ばして数えるので、
// 未入力が2人なら必ずA・Bになる。上限6人なのでZを超えることはない。
const namedOthers = computed(() => {
  let unnamed = 0
  return usedOthers.value.map((p) =>
    p.name.trim() ? p : { ...p, name: String.fromCharCode(65 + unnamed++) }
  )
})

const compatibilityInput = computed(() => ({ self: self.value, others: namedOthers.value }))
const { result } = useCompatibility(compatibilityInput)

const { recordCompatibilityDiagnosis } = useDiagnosisHistory()
function submit() {
  if (!canSubmit.value) return
  recordCompatibilityDiagnosis(result.value.self, result.value.others)
  const people = [{ ...self.value, name: self.value.name.trim() }, ...namedOthers.value.map((p) => ({ ...p, name: p.name.trim() }))]
  navigateTo({ path: '/compatibility/result', query: { p: people.map(encodePerson) } })
}
</script>

<template>
  <div class="paper-page paper-page--header min-h-screen">
    <IconSprite />

    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">Compatibility Reading</span>
        <h1 class="font-display masthead__title">相性診断</h1>
        <p class="masthead__sub">紋章の組み合わせから、あなたと大切な人との相性を読み解きます。</p>
      </div>

      <form class="mx-auto max-w-[560px] space-y-5" @submit.prevent="submit">
        <div class="rounded-xl p-6" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
          <div class="mb-3 text-[11px] tracking-[.1em]" style="color: var(--gold-deep);">あなた</div>
          <div class="space-y-3.5">
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">お名前</label>
              <input
                v-model="self.name"
                type="text"
                placeholder="結衣"
                class="w-full rounded px-3.5 py-2.5 text-sm outline-none"
                style="border: 1px solid var(--gold-line); background: var(--paper); color: var(--ink);"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">生年月日</label>
              <BirthdateSelect v-model="self.birthdate" theme="paper" />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">性別</label>
              <GenderRadio v-model="self.gender" />
            </div>
          </div>
        </div>

        <!-- 空欄の枠が並ぶことになるので、埋めなくてよいことを明示しておく。 -->
        <p class="text-center text-[12px]" style="color: var(--ink-faint);">
          お相手は最大{{ MAX_OTHER_PEOPLE }}人まで同時に診断できます。使わない枠は空のままで構いません。<br />
          お名前が未入力の方は、A・B…と表示されます。
        </p>

        <div v-for="(other, i) in others" :key="other.id" class="rounded-xl p-6" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-[11px] tracking-[.1em]" style="color: var(--gold-deep);">相手 {{ i + 1 }}</span>
            <button
              v-if="others.length > 1"
              type="button"
              class="text-[12px]"
              style="color: var(--ink-faint);"
              @click="removePerson(other.id)"
            >
              削除
            </button>
          </div>
          <div class="space-y-3.5">
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">お名前</label>
              <input
                v-model="other.name"
                type="text"
                placeholder="例：たろう"
                class="w-full rounded px-3.5 py-2.5 text-sm outline-none"
                style="border: 1px solid var(--gold-line); background: var(--paper); color: var(--ink);"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">生年月日</label>
              <BirthdateSelect v-model="other.birthdate" theme="paper" />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">性別</label>
              <GenderRadio v-model="other.gender" />
            </div>
          </div>
        </div>

        <!-- 既定で上限ぶんの枠が出ているので、通常このボタンは出ない。枠を削除した後だけ
             戻す手段として現れる(常時disabledのボタンを置くと壊れて見えるためv-if)。 -->
        <button
          v-if="canAddMore"
          type="button"
          class="w-full rounded-full px-6.5 py-2.5 text-center text-[13.5px] font-semibold"
          style="border: 1px solid var(--gold-line); color: var(--ink-soft);"
          @click="addPerson"
        >
          相手を追加する（最大{{ MAX_OTHER_PEOPLE }}人まで）
        </button>

        <button
          type="submit"
          :disabled="!canSubmit"
          class="w-full rounded-full py-3.5 text-[14.5px] font-bold tracking-[.03em] disabled:opacity-40"
          style="background: var(--gold); color: #241a06;"
        >
          相性を診断する
        </button>
        <p v-if="!canSubmit" class="text-center text-[12px]" style="color: var(--ink-faint);">
          診断したいお相手を、1人以上ご入力ください（お名前か生年月日のどちらかで結構です）。
        </p>
      </form>

    </div>
  </div>
</template>
