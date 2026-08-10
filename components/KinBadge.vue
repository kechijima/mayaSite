<script setup lang="ts">
defineProps<{ kin: number }>()
</script>

<template>
  <div class="kin-medal">
    <span class="kin-medal__bg" />
    <span class="kin-medal__ring1" />
    <span class="kin-medal__ring2" />
    <span class="kin-medal__diamond kin-medal__diamond--top" />
    <span class="kin-medal__diamond kin-medal__diamond--bottom" />
    <div class="kin-medal__body">
      <span class="kin-medal__label">KIN</span>
      <span class="kin-medal__num">{{ kin }}</span>
    </div>
  </div>
</template>
