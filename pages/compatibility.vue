<script setup lang="ts">
import { MAX_OTHER_PEOPLE, type PersonInput, type SealAttribute } from '~/composables/useCompatibility'
import { DEFAULT_GENDER, GENDER_OPTIONS, isGender } from '~/utils/gender'
import { COMPATIBILITY_RELATION_CHIP_CLASS } from '~/utils/compatibility'

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
const others = ref<PersonInput[]>([makeOther()])

const canAddMore = computed(() => others.value.length < MAX_OTHER_PEOPLE)
function addPerson() {
  if (canAddMore.value) others.value.push(makeOther())
}
function removePerson(id: string) {
  others.value = others.value.filter((p) => p.id !== id)
}

const compatibilityInput = computed(() => ({ self: self.value, others: others.value }))
const { result } = useCompatibility(compatibilityInput)

const submitted = ref(false)
const { recordCompatibilityDiagnosis } = useDiagnosisHistory()
function submit() {
  submitted.value = true
  recordCompatibilityDiagnosis(result.value.self, result.value.others)
}
function editAgain() {
  submitted.value = false
}
</script>

<template>
  <div class="min-h-screen bg-ink-950 bg-pinstripe font-body text-parchment-100 pb-24">
    <div class="mx-auto flex max-w-[720px] items-center justify-between border-b border-gold-500/30 px-5 py-3.5 text-xs tracking-[.04em] text-parchment-300">
      <span>マヤ暦占い ドリームスペル診断</span>
      <NuxtLink to="/" class="text-parchment-300/70">トップへ</NuxtLink>
    </div>

    <div class="px-5 pb-7 pt-11 text-center">
      <span class="font-body font-eyebrow-italic mb-1 block text-[16px] text-gold-300">Compatibility Reading</span>
      <h1 class="text-balance font-display text-[clamp(30px,6vw,42px)] tracking-[.06em] [text-shadow:0_0_24px_rgba(248,200,113,0.2)]">
        相性診断
      </h1>
      <p class="mt-2.5 text-sm text-parchment-300">紋章の組み合わせから、あなたと大切な人との相性を読み解きます。</p>
    </div>

    <div class="mx-auto max-w-[720px] px-5">
      <form v-if="!submitted" class="space-y-5" @submit.prevent="submit">
        <div class="rounded border border-gold-500/30 bg-white/[.02] p-7">
          <div class="mb-1.5 text-[11px] tracking-[.1em] text-gold-300">あなた</div>
          <div class="space-y-3.5">
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">お名前</label>
              <input
                v-model="self.name"
                type="text"
                placeholder="結衣"
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none placeholder:text-parchment-300/40 focus:border-gold-500"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">生年月日</label>
              <BirthdateSelect v-model="self.birthdate" />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">性別</label>
              <select
                v-model="self.gender"
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
              >
                <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value" class="bg-ink-950">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <div v-for="(other, i) in others" :key="other.id" class="rounded border border-gold-500/30 bg-white/[.02] p-7">
          <div class="mb-1.5 flex items-center justify-between">
            <span class="text-[11px] tracking-[.1em] text-gold-300">相手 {{ i + 1 }}</span>
            <button
              v-if="others.length > 1"
              type="button"
              class="text-[12px] text-parchment-300/70"
              @click="removePerson(other.id)"
            >
              削除
            </button>
          </div>
          <div class="space-y-3.5">
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">お名前</label>
              <input
                v-model="other.name"
                type="text"
                placeholder="例：友人A"
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none placeholder:text-parchment-300/40 focus:border-gold-500"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">生年月日</label>
              <BirthdateSelect v-model="other.birthdate" />
            </div>
            <div>
              <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">性別</label>
              <select
                v-model="other.gender"
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
              >
                <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value" class="bg-ink-950">{{ opt.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="button"
          :disabled="!canAddMore"
          class="w-full rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-100 disabled:opacity-30"
          @click="addPerson"
        >
          相手を追加する（最大{{ MAX_OTHER_PEOPLE }}人まで）
        </button>

        <button
          type="submit"
          class="w-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 py-3.5 text-[14.5px] font-bold tracking-[.03em] text-[#241a06]"
        >
          相性を診断する
        </button>
      </form>

      <template v-else>
        <section class="pb-2 pt-4">
          <SectionDivider label="参加者" eyebrow="Participants" />
          <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <PersonProfileCard :profile="result.self" />
            <PersonProfileCard v-for="p in result.others" :key="p.id" :profile="p" />
          </div>
        </section>

        <section class="pb-2 pt-14">
          <SectionDivider label="相性" eyebrow="Compatibility" />
          <div class="space-y-3.5">
            <div v-for="pair in result.pairs" :key="pair.otherId" class="rounded border border-gold-500/30 bg-white/[.02] p-5">
              <h3 class="mb-3.5 font-display text-[17px]" :class="pair.destinyRelationLabel ? 'text-red-400' : ''">{{ result.self.name }} × {{ pair.otherName }}</h3>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div v-for="c in pair.combinations" :key="`${c.selfAttribute}-${c.otherAttribute}`" class="flex flex-col items-center gap-2 rounded border border-gold-500/20 bg-white/[.02] px-3 py-3.5 text-center">
                  <span class="text-[10.5px] tracking-[.04em] text-parchment-300">{{ attributeLabel(c.selfAttribute) }} × {{ attributeLabel(c.otherAttribute) }}</span>

                  <div class="flex items-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.selfSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.selfSealName }}</span>
                    </div>

                    <span class="text-[13px] text-gold-300">×</span>

                    <div class="flex flex-col items-center gap-1">
                      <MayaGlyph :seal-index="c.otherSealIndex" size="md" />
                      <span class="text-[12px] font-semibold">{{ c.otherSealName }}</span>
                    </div>
                  </div>

                  <span class="mt-1 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" :class="COMPATIBILITY_RELATION_CHIP_CLASS[c.relation]">{{ c.relationLabel }}</span>
                </div>

                <div class="flex flex-col items-center gap-2 rounded border border-gold-500/20 bg-white/[.02] px-3 py-3.5 text-center">
                  <span class="text-[10.5px] tracking-[.04em] text-parchment-300">運命数字</span>

                  <div class="flex items-center gap-3">
                    <div class="flex flex-col items-center gap-1">
                      <div class="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-full border-2 border-gold-500 bg-ink-900">
                        <span class="font-display text-[14px] text-gold-300 tabular-nums">KIN {{ result.self.kin }}</span>
                      </div>
                      <span class="text-[12px] font-semibold">{{ result.self.name }}</span>
                    </div>

                    <span class="text-[13px] text-gold-300">×</span>

                    <div class="flex flex-col items-center gap-1">
                      <div class="flex h-[76px] w-[76px] flex-none items-center justify-center rounded-full border-2 border-gold-500 bg-ink-900">
                        <span class="font-display text-[14px] text-gold-300 tabular-nums">KIN {{ pair.otherKin }}</span>
                      </div>
                      <span class="text-[12px] font-semibold">{{ pair.otherName }}</span>
                    </div>
                  </div>

                  <span
                    class="mt-1 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
                    :class="pair.destinyRelationLabel ? 'bg-red-500/15 text-red-400' : 'border border-parchment-300/30 text-parchment-300 font-semibold'"
                  >
                    {{ pair.destinyRelationLabel ?? '特になし' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div class="mt-8 flex justify-center">
          <button
            type="button"
            class="rounded-full border border-parchment-300/30 px-6.5 py-2.5 text-center text-[13.5px] font-semibold text-parchment-100"
            @click="editAgain"
          >
            もう一度診断する
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
