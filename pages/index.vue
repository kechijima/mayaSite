<script setup lang="ts">
import { DEFAULT_GENDER, type Gender } from '~/utils/gender'
import jmbLogoSrc from '~/assets/images/optimized/jmb-logo.webp'

const name = ref('')
const birthdate = ref('')
const gender = ref<Gender>(DEFAULT_GENDER)
const router = useRouter()
const { recordSingleDiagnosis } = useDiagnosisHistory()

function submit() {
  recordSingleDiagnosis({ name: name.value, birthdate: birthdate.value, gender: gender.value })
  router.push({ path: '/result', query: { name: name.value || undefined, birth: birthdate.value || undefined, gender: gender.value } })
}

// 今日のアーキタイプ: 現在の日付を生年月日と同じ扱いで診断パイプラインに通し、今日のKIN・
// 太陽の紋章・銀河の音・ウェイブスペルを得る。ssr:false の完全静的SPAなので `new Date()` を
// クライアントで評価してもハイドレーション不整合は起きない。表示のみ(導線なし)なので gender は
// 既定値でよく、ポートレート枠の見た目にしか影響しない。
const today = new Date()
const pad = (n: number) => String(n).padStart(2, '0')
const todayInput = ref({
  name: '',
  birthdate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
  gender: DEFAULT_GENDER
})
const { result: todayResult } = useDiagnosis(todayInput)
const todayLabel = computed(() => `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`)
</script>

<template>
  <div class="paper-page min-h-screen">
    <IconSprite />

    <div class="sheet sheet--flush">
      <div class="masthead">
        <div class="masthead__arch" aria-hidden="true" />
        <!-- JMB(日本マヤ暦文化協会)認定ロゴ。ページタイトルの上に置く認定バッジなので、
             見出しの一部ではなく独立した画像として扱う(alt付き)。 -->
        <img class="masthead__logo" :src="jmbLogoSrc" width="448" height="448" alt="JAPAN MAYA BU CERTIFIED" fetchpriority="high" decoding="async" />
        <span class="masthead__eyebrow">Maya Sacred Calendar</span>
        <h1 class="font-display masthead__title">JMBマヤ暦 無料診断</h1>
        <p class="masthead__sub">古代マヤの神聖暦「ツォルキン」が、あなたの生年月日から本質と運勢を読み解きます。</p>
      </div>

      <!-- 診断入力: 1人用のKIN診断(名前+生年月日 → /result) -->
      <form id="diagnose" class="mx-auto mt-8 max-w-[560px] space-y-3.5 rounded-xl p-6" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);" @submit.prevent="submit">
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">お名前</label>
          <input
            v-model="name"
            type="text"
            placeholder="結衣"
            class="w-full rounded px-3.5 py-2.5 text-sm outline-none"
            style="border: 1px solid var(--gold-line); background: var(--paper); color: var(--ink);"
          />
        </div>
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">生年月日</label>
          <BirthdateSelect v-model="birthdate" theme="paper" />
        </div>
        <div>
          <label class="mb-1.5 block text-[11px] tracking-[.1em]" style="color: var(--ink-soft);">性別</label>
          <GenderRadio v-model="gender" />
        </div>
        <button
          type="submit"
          class="!mt-6 w-full rounded-full py-3.5 text-[14.5px] font-bold tracking-[.03em]"
          style="background: var(--gold); color: #241a06;"
        >
          無料で診断する
        </button>
      </form>

      <p class="mx-auto mt-6 max-w-[560px] text-center text-[12px]" style="color: var(--ink-faint);">
        まずは無料診断で、あなたの太陽の紋章とウェイブスペルをご覧いただけます。
      </p>

      <!-- 今日のアーキタイプ: 現在の日付のKIN/紋章/音/ウェイブスペル。診断結果ページ(/result)の
           最上部と同じ並び — 数字カード + 「太陽の紋章 × ウェイブスペル」。表示のみ・導線なし。
           日付は SectionDivider の eyebrow に出しているので、カードは KIN と銀河の音の2枚。 -->
      <section id="today" class="section">
        <SectionDivider label="今日のアーキタイプ" :eyebrow="todayLabel" />

        <div class="herostats herostats--pair">
          <div class="numcell">
            <span class="numcell__label">KIN</span>
            <span class="herostats__num">{{ todayResult.kin }}</span>
          </div>
          <div class="numcell">
            <span class="numcell__label">銀河の音</span>
            <span class="herostats__num">{{ todayResult.toneIndex + 1 }}</span>
          </div>
        </div>

        <div class="kinduo">
          <div class="kinduo__art kinduo__art--l"><MayaPortraitFrame :seal-index="todayResult.sealIndex" :gender="todayResult.gender" /></div>
          <div class="kinduo__art kinduo__art--r"><MayaPortraitFrame :seal-index="todayResult.wavespellSealIndex" :gender="todayResult.gender" /></div>
          <div class="kinduo__cap kinduo__cap--l">
            <span class="kinduo__role">太陽の紋章</span>
            <span class="font-display kinduo__seal">{{ todayResult.sun.seal.name }}</span>
          </div>
          <span class="kinduo__x" aria-hidden="true"><svg><use href="#i-cross" /></svg></span>
          <div class="kinduo__cap kinduo__cap--r">
            <span class="kinduo__role">ウェイブスペル</span>
            <span class="font-display kinduo__seal">{{ todayResult.wavespell.seal.name }}</span>
          </div>
        </div>
      </section>

      <!-- 相性診断への誘導: 無料機能、ゲート無し -->
      <section id="compatibility" class="section">
        <SectionDivider label="相性診断" eyebrow="大切な人とのつながりを読み解く" />
        <!-- スマホではディバイダーの縦レール(左右のダイヤ飾り)がコンテンツ幅内に入り込むため、
             カードを左右に寄せてレールの内側に収める。sm以上はレールが.sheetの余白外に逃げるので
             従来どおり中央寄せ(mx-auto)。 -->
        <div class="mx-8 sm:mx-auto max-w-[560px] rounded-xl p-6 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
          <div class="mb-2 font-display text-[17px]" style="color: var(--gold-deep);">身近な人との相性を無料で診断</div>
          <p class="mb-4 text-[13px]" style="color: var(--ink-soft);">パートナーや友人の生年月日を入れるだけで、紋章の組み合わせから相性を読み解きます。</p>
          <NuxtLink
            to="/compatibility"
            class="inline-block rounded-full px-6.5 py-2.5 text-[13.5px] font-semibold"
            style="border: 1px solid var(--gold); color: var(--gold-deep);"
          >
            相性診断をはじめる
          </NuxtLink>
        </div>
      </section>

      <!-- ニュース: 現状はSNSアイコンのみ -->
      <section id="news" class="section">
        <SectionDivider label="ニュース" eyebrow="News &amp; Social" />
        <div class="mx-auto flex max-w-[560px] items-center justify-center gap-4">
          <a href="#" aria-label="X (Twitter)" class="sns-icon" @click.prevent>
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
          </a>
          <a href="#" aria-label="Instagram" class="sns-icon" @click.prevent>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>
          </a>
          <a href="#" aria-label="LINE" class="sns-icon" @click.prevent>
            <svg viewBox="0 0 24 24" fill="currentColor" width="21" height="21"><path d="M12 3.5c-5.24 0-9.5 3.4-9.5 7.6 0 3.76 3.38 6.9 7.94 7.5.31.06.73.2.84.47.1.24.06.6.03.85l-.13.82c-.04.24-.19.95.84.52 1.03-.44 5.55-3.27 7.57-5.6 1.4-1.53 2.06-3.08 2.06-4.98 0-4.2-4.26-7.6-9.69-7.6Zm-3.86 10.1H6.2a.5.5 0 0 1-.5-.5V9.24a.5.5 0 0 1 1 0v3.36h1.44a.5.5 0 0 1 0 1Zm2-0.5a.5.5 0 0 1-1 0V9.24a.5.5 0 0 1 1 0v3.86Zm4.62 0a.5.5 0 0 1-.34.47.5.5 0 0 1-.57-.17l-1.98-2.7v2.4a.5.5 0 0 1-1 0V9.24a.5.5 0 0 1 .9-.3l1.99 2.7v-2.4a.5.5 0 0 1 1 0v3.86Zm3.1-2.43a.5.5 0 0 1 0 1h-1.44v.93h1.44a.5.5 0 0 1 0 1h-1.94a.5.5 0 0 1-.5-.5V9.24a.5.5 0 0 1 .5-.5h1.94a.5.5 0 0 1 0 1h-1.44v.93h1.44Z" /></svg>
          </a>
          <a href="#" aria-label="YouTube" class="sns-icon" @click.prevent>
            <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.27 5 12 5 12 5s-6.27 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.73 19 12 19 12 19s6.27 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z" /></svg>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.sns-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  border: 1px solid var(--gold-line);
  background: var(--paper-panel);
  color: var(--gold-deep);
  box-shadow: var(--shadow);
  transition: color .15s ease, border-color .15s ease, transform .15s ease;
}
.sns-icon:hover {
  color: var(--gold);
  border-color: var(--gold);
  transform: translateY(-1px);
}
</style>
