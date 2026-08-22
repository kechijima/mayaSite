<script setup lang="ts">
import { MAX_OTHER_PEOPLE, type PersonInput, type SealAttribute } from '~/composables/useCompatibility'
import { DEFAULT_GENDER, isGender } from '~/utils/gender'
import { DEFAULT_BIRTHDATE } from '~/utils/birthdate'
import { COMPATIBILITY_RELATION_CONTENT } from '~/utils/compatibility'
import { DESTINY_RELATION_CONTENT } from '~/utils/destinyCompatibility'

function attributeLabel(attr: SealAttribute) {
  return attr === 'sun' ? '太陽の紋章' : 'ウェイブスペル'
}

const route = useRoute()

const initialGenderQuery = route.query.gender as string | undefined
const self = ref<PersonInput>({
  id: 'self',
  name: (route.query.name as string) || '',
  birthdate: (route.query.birth as string) || '',
  gender: initialGenderQuery && isGender(initialGenderQuery) ? initialGenderQuery : DEFAULT_GENDER
})

// Deterministic IDs only — the initial `others` array is built during setup() on both server
// and client, so a random ID generator here would cause a v-for :key hydration mismatch.
let nextOtherId = 0
function makeOther(): PersonInput {
  return { id: `other-${nextOtherId++}`, name: '', birthdate: '', gender: DEFAULT_GENDER }
}
// 最初から上限(6人)ぶんの枠を並べておく — 「追加」を押させてから入力させるより、
// 何人まで登録できるのかが一目で分かり、複数人を続けて入力するときの操作も減る。
const others = ref<PersonInput[]>(Array.from({ length: MAX_OTHER_PEOPLE }, makeOther))

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

const submitted = ref(false)
const { recordCompatibilityDiagnosis } = useDiagnosisHistory()
function submit() {
  if (!canSubmit.value) return
  submitted.value = true
  recordCompatibilityDiagnosis(result.value.self, result.value.others)
}
function editAgain() {
  submitted.value = false
}
</script>

<template>
  <div class="paper-page min-h-screen">
    <IconSprite />

    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">Compatibility Reading</span>
        <h1 class="font-display masthead__title">相性診断</h1>
        <p class="masthead__sub">紋章の組み合わせから、あなたと大切な人との相性を読み解きます。</p>
      </div>

      <form v-if="!submitted" class="mx-auto max-w-[560px] space-y-5" @submit.prevent="submit">
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

      <template v-else>
        <section class="section">
          <SectionDivider label="参加者" eyebrow="Participants" />
          <div class="mx-auto grid max-w-[340px] grid-cols-1 gap-3.5 sm:max-w-[720px] sm:grid-cols-2">
            <PersonProfileCard :profile="result.self" />
            <PersonProfileCard v-for="p in result.others" :key="p.id" :profile="p" />
          </div>
        </section>

        <section class="section">
          <SectionDivider label="相性" eyebrow="Compatibility" />
          <div class="mx-auto max-w-[340px] space-y-6 sm:max-w-[720px]">
            <div v-for="pair in result.pairs" :key="pair.otherId" class="rounded-xl p-5" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
              <h3 class="mb-4 font-display text-[17px]" :style="{ color: pair.destinyRelation ? 'var(--seal-red)' : 'var(--ink)' }">{{ result.self.name }} × {{ pair.otherName }}</h3>

              <div class="mb-2 text-[11px] font-bold tracking-[.08em]" style="color: var(--gold-deep);">{{ result.self.name }}さんから見た{{ pair.otherName }}さん</div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-for="c in pair.combinations.filter((c) => !c.reversed)" :key="`${c.selfAttribute}-${c.otherAttribute}-${c.reversed}`" class="rounded-lg px-3.5 py-4 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
                  <span class="text-[10.5px] tracking-[.04em]" style="color: var(--ink-faint);">
                    {{ attributeLabel(c.selfAttribute) }}（{{ result.self.name }}） × {{ attributeLabel(c.otherAttribute) }}（{{ pair.otherName }}）
                  </span>

                  <div class="mt-2 flex items-center justify-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.selfSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.selfSealName }}</span>
                    </div>
                    <span class="text-[13px]" style="color: var(--gold-deep);">×</span>
                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.otherSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.otherSealName }}</span>
                    </div>
                  </div>

                  <span class="dossier__badge mt-2.5 inline-block">{{ c.relationLabel }}</span>
                  <p class="mt-2 text-left text-[12px] leading-[1.7]" style="color: var(--ink-soft);">{{ COMPATIBILITY_RELATION_CONTENT[c.relation].text }}</p>
                </div>

                <div class="rounded-lg px-3.5 py-4 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
                  <span class="text-[10.5px] tracking-[.04em]" style="color: var(--ink-faint);">運命数字</span>

                  <div class="mt-2 flex items-center justify-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <GoldMedal :value="result.self.kin" :size="68" :num-font-size="16" />
                      <span class="text-[12px] font-semibold">{{ result.self.name }}</span>
                    </div>
                    <span class="text-[13px]" style="color: var(--gold-deep);">×</span>
                    <div class="flex flex-col items-center gap-1">
                      <GoldMedal :value="pair.otherKin" :size="68" :num-font-size="16" />
                      <span class="text-[12px] font-semibold">{{ pair.otherName }}</span>
                    </div>
                  </div>

                  <span
                    class="mt-2.5 inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                    :style="pair.destinyRelation
                      ? { background: 'var(--gold)', color: '#241a06' }
                      : { border: '1px solid var(--gold-line-soft)', color: 'var(--ink-faint)' }"
                  >
                    {{ pair.destinyRelationLabel ?? '特になし' }}
                  </span>
                  <p v-if="pair.destinyRelation" class="mt-2 text-left text-[12px] leading-[1.7]" style="color: var(--ink-soft);">
                    {{ DESTINY_RELATION_CONTENT[pair.destinyRelation].text }}
                  </p>
                </div>
              </div>

              <div class="mb-2 mt-5 text-[11px] font-bold tracking-[.08em]" style="color: var(--gold-deep);">{{ pair.otherName }}さんから見た{{ result.self.name }}さん</div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-for="c in pair.combinations.filter((c) => c.reversed)" :key="`${c.selfAttribute}-${c.otherAttribute}-${c.reversed}`" class="rounded-lg px-3.5 py-4 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
                  <span class="text-[10.5px] tracking-[.04em]" style="color: var(--ink-faint);">
                    {{ attributeLabel(c.otherAttribute) }}（{{ pair.otherName }}） × {{ attributeLabel(c.selfAttribute) }}（{{ result.self.name }}）
                  </span>

                  <div class="mt-2 flex items-center justify-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.otherSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.otherSealName }}</span>
                    </div>
                    <span class="text-[13px]" style="color: var(--gold-deep);">×</span>
                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.selfSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.selfSealName }}</span>
                    </div>
                  </div>

                  <span class="dossier__badge mt-2.5 inline-block">{{ c.relationLabel }}</span>
                  <p class="mt-2 text-left text-[12px] leading-[1.7]" style="color: var(--ink-soft);">{{ COMPATIBILITY_RELATION_CONTENT[c.relation].text }}</p>
                </div>

                <div class="rounded-lg px-3.5 py-4 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper);">
                  <span class="text-[10.5px] tracking-[.04em]" style="color: var(--ink-faint);">運命数字</span>

                  <div class="mt-2 flex items-center justify-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <GoldMedal :value="pair.otherKin" :size="68" :num-font-size="16" />
                      <span class="text-[12px] font-semibold">{{ pair.otherName }}</span>
                    </div>
                    <span class="text-[13px]" style="color: var(--gold-deep);">×</span>
                    <div class="flex flex-col items-center gap-1">
                      <GoldMedal :value="result.self.kin" :size="68" :num-font-size="16" />
                      <span class="text-[12px] font-semibold">{{ result.self.name }}</span>
                    </div>
                  </div>

                  <span
                    class="mt-2.5 inline-block rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                    :style="pair.destinyRelation
                      ? { background: 'var(--gold)', color: '#241a06' }
                      : { border: '1px solid var(--gold-line-soft)', color: 'var(--ink-faint)' }"
                  >
                    {{ pair.destinyRelationLabel ?? '特になし' }}
                  </span>
                  <p v-if="pair.destinyRelation" class="mt-2 text-left text-[12px] leading-[1.7]" style="color: var(--ink-soft);">
                    {{ DESTINY_RELATION_CONTENT[pair.destinyRelation].text }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="mt-8 flex justify-center">
          <button
            type="button"
            class="rounded-full px-6.5 py-2.5 text-center text-[13.5px] font-semibold"
            style="border: 1px solid var(--gold-line); color: var(--ink-soft);"
            @click="editAgain"
          >
            もう一度診断する
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
