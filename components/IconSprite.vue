<script setup lang="ts">
// Inline SVG <symbol> defs referenced via <svg><use href="#i-xxx"/></svg> throughout
// pages/result.vue and pages/compatibility.vue's paper-theme markup (block__head icons,
// checklist checkmarks, the LockedVeil-equivalent lock icon). Render once per page.
</script>

<template>
  <svg class="sr-only" aria-hidden="true">
    <symbol id="i-crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M4 17.5h16" /><path d="M4.5 17 3 9l5 3.6L12 6l4 6.6L21 9l-1.5 8z" /></symbol>
    <symbol id="i-sparkle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" /></symbol>
    <symbol id="i-heart" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"><path d="M12 20s-7.4-4.6-9.8-9.1C.7 7.7 2.2 4.5 5.5 4c2-.3 3.7.7 4.9 2.3L12 8l1.6-1.7C14.8 4.7 16.5 3.7 18.5 4c3.3.5 4.8 3.7 3.3 6.9C19.4 15.4 12 20 12 20z" /></symbol>
    <symbol id="i-heart-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="M12 20s-7.4-4.6-9.8-9.1C.7 7.7 2.2 4.5 5.5 4c2-.3 3.7.7 4.9 2.3L12 8l1.6-1.7C14.8 4.7 16.5 3.7 18.5 4c3.3.5 4.8 3.7 3.3 6.9C19.4 15.4 12 20 12 20z" /><path d="M9 9.5 15 16M15 9.5 9 16" /></symbol>
    <symbol id="i-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5 9.5 18 20 6" /></symbol>
    <symbol id="i-warn" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20H2z" /><path d="M12 9.5v5" /><circle cx="12" cy="17.2" r=".4" fill="currentColor" /></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="9.5" rx="1.6" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7" /></symbol>
    <symbol id="i-scroll" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h11a2 2 0 0 1 2 2v13a2 2 0 0 1-2-2H8" /><path d="M6 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2" /><path d="M9 9h7M9 13h7" /></symbol>
    <symbol id="i-path" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="18.5" r="1.7" /><circle cx="18.5" cy="5.5" r="1.7" /><path d="M7 17.3C11 13 9 9 13 6.8" /></symbol>
    <symbol id="i-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 19.5 6.5V11.5C19.5 16.3 16.3 19.8 12 21C7.7 19.8 4.5 16.3 4.5 11.5V6.5Z" /><path d="M9 12l2 2 4-4.5" /></symbol>
    <symbol id="i-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a5.5 5.5 0 0 0-3 10.1c.7.5 1.1 1.2 1.1 2v.4h3.8v-.4c0-.8.4-1.5 1.1-2A5.5 5.5 0 0 0 12 3.5z" /><path d="M9.8 18.5h4.4M10.5 21h3" /></symbol>
    <symbol id="i-sprout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21v-9.5" /><path d="M12 12C12 8 9 6 5 6c0 4 3 6 7 6z" /><path d="M12 9.2C12 6.3 14.2 4.5 17.3 4.5c0 2.9-2.2 4.7-5.3 4.7z" /></symbol>
    <symbol id="i-trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v4.2a4 4 0 0 1-8 0V4z" /><path d="M8 5.2H5.3a3 3 0 0 0 3 3.6M16 5.2h2.7a3 3 0 0 1-3 3.6" /><path d="M12 12.2V15" /><path d="M9.3 20h5.4" /><path d="M10.2 17h3.6v3h-3.6z" /></symbol>
    <symbol id="i-gem" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 9 8 4h8l3.5 5-7.5 11z" /><path d="M4.5 9h15M9 9l3 10 3-10M8 4l1 5M16 4l-1 5" /></symbol>
    <symbol id="i-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.8h16V16H10l-4.2 3.4V16H4V5.8z" /></symbol>
    <symbol id="i-chat-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3.3 5.3h11.4v7.7H8.8L6 15.5v-2.5H3.3V5.3z" /><path d="M13.2 9.6h7.5v7H18v2.6l-2.9-2.6" /></symbol>
    <symbol id="i-clover" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3.3" /><circle cx="15" cy="9" r="3.3" /><circle cx="9" cy="15" r="3.3" /><circle cx="15" cy="15" r="3.3" /><path d="M12 18v3" /></symbol>
    <symbol id="i-clover-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3.3" /><circle cx="15" cy="9" r="3.3" /><circle cx="9" cy="15" r="3.3" /><circle cx="15" cy="15" r="3.3" /><path d="M12 18v3" /><path d="M4.5 4.5l15 15" /></symbol>
    <symbol id="i-arrow-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15.5M13.5 5.5 20 12l-6.5 6.5" /></symbol>
    <symbol id="i-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5 5" /></symbol>
    <symbol id="i-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.7 15.8 7M8.2 13.3l7.6 3.7" /></symbol>
    <!-- 太陽の紋章「×」ウェイブスペル の掛け合わせ記号。細めの線で、装飾の金線と同じ質感に揃えている。 -->
    <symbol id="i-cross" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M5.5 5.5l13 13M18.5 5.5l-13 13" /></symbol>
  </svg>
</template>
