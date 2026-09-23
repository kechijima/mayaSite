<script setup lang="ts">
// 紹介コードのコピーボタン(/admin/teams)。管理画面はIconSpriteを使わず各所で
// インラインSVGを書いているので(layouts/admin.vue参照)、それに倣っている。
// コピー後はアイコンをチェックに差し替え、しばらくして元に戻す — 文言ではなく
// アイコンで結果を出すぶん、aria-labelとtitleも同時に切り替えて読み上げにも伝える。
const props = withDefaults(defineProps<{ value: string; label?: string }>(), {
  label: 'コードをコピー'
})

const copied = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | null = null

// navigator.clipboard は「セキュアコンテキスト(HTTPS または localhost)」でしか
// 使えず、ドキュメントにフォーカスが無い場合も拒否される。管理画面を社内LANのIPに
// 平文HTTPで開く運用があり得るので、その場合に無反応にならないよう旧APIで拾い直す。
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 下のフォールバックへ倒す
  }
  try {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    // 画面外に置かずfixedで隠すのは、iOSでselect()前にスクロールが飛ぶのを避けるため。
    field.style.position = 'fixed'
    field.style.top = '0'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(field)
    return ok
  } catch {
    return false
  }
}

async function copy() {
  // コピーできなかったときは成功表示を出さない。コード自体は画面に出ているので、
  // 選択してコピーしてもらう。
  if (!(await writeClipboard(props.value))) return
  copied.value = true
  if (resetTimer) clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 2000)
}

// 画面遷移でタイマーが残らないようにする。
onBeforeUnmount(() => {
  if (resetTimer) clearTimeout(resetTimer)
})

const title = computed(() => (copied.value ? 'コピーしました' : props.label))
</script>

<template>
  <button
    type="button"
    class="inline-flex h-10 w-10 flex-none items-center justify-center sm:h-8 sm:w-8 rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-slate-300 hover:text-brass-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-gold-300"
    :class="copied ? '!border-emerald-500/60 !text-emerald-600 dark:!text-emerald-400' : ''"
    :title="title"
    :aria-label="title"
    @click="copy"
  >
    <svg v-if="copied" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  </button>
</template>
