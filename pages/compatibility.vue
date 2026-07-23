<script setup lang="ts">
import { MAX_OTHER_PEOPLE, type PersonInput } from '~/composables/useCompatibility'

const route = useRoute()

const self = ref<PersonInput>({
  id: 'self',
  name: (route.query.name as string) || '',
  birthdate: (route.query.birth as string) || ''
})

// Deterministic IDs only — the initial `others` array is built during setup() on both server
// and client, so a random ID generator here would cause a v-for :key hydration mismatch.
let nextOtherId = 0
function makeOther(): PersonInput {
  return { id: `other-${nextOtherId++}`, name: '', birthdate: '' }
}
const others = ref<PersonInput[]>([makeOther()])

const canAddMore = computed(() => others.value.length < MAX_OTHER_PEOPLE)
function addPerson() {
  if (canAddMore.value) others.value.push(makeOther())
}
function removePerson(id: string) {
  others.value = others.value.filter((p) => p.id !== id)
}

const submitted = ref(false)
function submit() {
  submitted.value = true
}
function editAgain() {
  submitted.value = false
}

const compatibilityInput = computed(() => ({ self: self.value, others: others.value }))
const { result } = useCompatibility(compatibilityInput)
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
              <input
                v-model="self.birthdate"
                type="date"
                required
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
              />
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
              <input
                v-model="other.birthdate"
                type="date"
                required
                class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
              />
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
              <h3 class="mb-1.5 font-display text-[17px]">
                {{ result.self.name }} × {{ pair.otherName }}
                <span class="ml-1.5 text-[13px] font-normal text-gold-300">{{ pair.relationLabel }}</span>
              </h3>
              <p class="mb-2.5 text-[14.5px] leading-[1.9] opacity-90">{{ pair.relationText }}</p>
              <p class="text-[13px] leading-[1.8] text-parchment-300">{{ pair.toneMatchText }}</p>
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
