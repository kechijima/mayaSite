<template>
  <div class="flex min-h-screen items-center justify-center bg-[#f4f5f3] px-4 text-[#132019] dark:bg-[#0e1512] dark:text-[#edf2ef]">
    <div class="w-full max-w-[380px]">
      <div class="mb-7 text-center font-display text-base">
        JMBマヤ暦 無料診断
        <small class="mt-0.5 block font-body text-[10.5px] tracking-[.1em] text-[#8b968e] dark:text-[#748177]">ADMIN CONSOLE</small>
      </div>
      <div class="rounded-xl border border-[#dde1de] bg-white p-6 dark:border-[#2a3a32] dark:bg-[#16211c]">
        <slot />
      </div>
    </div>
  </div>
</template>
