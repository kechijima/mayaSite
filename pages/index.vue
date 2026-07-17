<script setup lang="ts">
const name = ref('')
const birthdate = ref('')
const router = useRouter()

function submit() {
  router.push({ path: '/result', query: { name: name.value || undefined, birth: birthdate.value || undefined } })
}
</script>

<template>
  <div class="min-h-screen bg-ink-950 bg-pinstripe font-body text-parchment-100">
    <div class="mx-auto flex min-h-screen max-w-[560px] flex-col items-center justify-center px-5 py-16 text-center">
      <span class="font-body font-eyebrow-italic mb-1 block text-[15px] text-gold-300">Maya Sacred Calendar</span>
      <h1 class="text-balance font-display text-[clamp(30px,7vw,44px)] tracking-[.06em] text-parchment-100 [text-shadow:0_0_24px_rgba(248,200,113,0.2)]">
        マヤ暦占い
      </h1>
      <p class="mt-3 text-sm text-parchment-300">
        古代マヤの神聖暦「ツォルキン」が、あなたの生年月日から本質と運勢を読み解きます。
      </p>

      <form class="mt-10 w-full space-y-5 rounded border border-gold-500/30 bg-white/[.02] p-7 text-left" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">お名前</label>
          <input
            v-model="name"
            type="text"
            placeholder="結衣"
            class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none placeholder:text-parchment-300/40 focus:border-gold-500"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em] text-parchment-300">生年月日</label>
          <input
            v-model="birthdate"
            type="date"
            required
            class="w-full rounded border border-gold-500/30 bg-transparent px-3.5 py-2.5 text-sm text-parchment-100 outline-none focus:border-gold-500 [color-scheme:dark]"
          />
        </div>
        <button
          type="submit"
          class="w-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 py-3.5 text-[14.5px] font-bold tracking-[.03em] text-[#241a06]"
        >
          無料で診断する
        </button>
      </form>

      <p class="mt-6 text-[12px] text-parchment-300/70">
        まずは無料診断で、あなたの太陽の紋章とウェイブスペルをご覧いただけます。
      </p>
    </div>
  </div>
</template>
