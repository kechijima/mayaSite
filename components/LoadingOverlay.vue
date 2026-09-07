<script setup lang="ts">
// 画面全体を覆うローディング。composables/useGlobalLoading.ts の件数が1以上のあいだ出る。
// 公開ページ(paper配色)と管理画面(コンソール配色)の両方に出るため、どちらのテーマにも
// 馴染むよう色は固定せず、背景は下の画面をうっすら透かす中間色にしている。
//
// v-if + <Transition> ではなく、常に描画して class で切り替えているのは事故を防ぐため。
// 当初は <Transition> を使っていたが、通信が速く終わると enter と leave が競合して
// 要素が leave-active のまま DOM に残り、opacity:0(見えない)のに position:fixed で
// 画面全体を覆い続け、あらゆるクリックを飲み込む状態になった(2026-09-07に発生)。
// 常時描画なら出入りの競合そのものが起きず、非表示時は pointer-events:none と
// visibility:hidden の二重で、万一表示状態がずれても操作を奪わない。
const { active } = useGlobalLoading()
</script>

<template>
  <div class="loading-overlay" :class="{ 'is-active': active }" role="status" aria-live="polite">
    <div class="loading-overlay__spinner" aria-hidden="true" />
    <p class="loading-overlay__label">通信中…</p>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: fixed;
  inset: 0;
  /* SiteHeader(z-index 50前後)やLockedVeilより確実に上に出す。 */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  background: rgba(28, 24, 16, 0.42);
  backdrop-filter: blur(2px);

  /* 非表示時。pointer-events と visibility の両方で操作を奪わないようにする。 */
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  /* visibility はフェードアウトが終わってから切り替える(0.15s遅延)。 */
  transition: opacity 0.15s ease, visibility 0s linear 0.15s;
}
.loading-overlay.is-active {
  opacity: 1;
  /* 操作を受け付けないことを見た目でも示す。二重送信の抑止も兼ねる。 */
  pointer-events: auto;
  cursor: progress;
  visibility: visible;
  transition: opacity 0.15s ease, visibility 0s;
}

.loading-overlay__spinner {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2.5px solid rgba(255, 255, 255, 0.28);
  border-top-color: #d9b45e;
  animation: loading-spin 0.7s linear infinite;
}
.loading-overlay__label {
  margin: 0;
  font-size: 12.5px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.86);
}

@keyframes loading-spin {
  to { transform: rotate(360deg); }
}

/* 動きを減らす設定の利用者には回転を止め、代わりに明滅で進行中であることを示す。 */
@media (prefers-reduced-motion: reduce) {
  .loading-overlay__spinner {
    animation: loading-pulse 1.2s ease-in-out infinite;
  }
  @keyframes loading-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
}
</style>
