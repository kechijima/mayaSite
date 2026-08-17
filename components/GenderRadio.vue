<script setup lang="ts">
import { GENDER_OPTIONS, type Gender } from '~/utils/gender'

// 性別の選択。選択肢が2つしかないので<select>(タップ→ドラムロール→確定の3手)ではなく
// ラジオボタン(1タップ)にしている。相性診断のように1画面に複数人分並ぶことがあるため、
// name属性はuseId()でインスタンスごとに一意にする — 同名だと別人のラジオが排他になってしまう。
defineProps<{ modelValue: Gender }>()
const emit = defineEmits<{ 'update:modelValue': [Gender] }>()

const name = useId()
</script>

<template>
  <div class="genderpick">
    <label v-for="opt in GENDER_OPTIONS" :key="opt.value" class="genderpick__opt" :class="{ 'is-on': modelValue === opt.value }">
      <input
        type="radio"
        :name="name"
        :value="opt.value"
        :checked="modelValue === opt.value"
        @change="emit('update:modelValue', opt.value)"
      />
      <span class="genderpick__dot" aria-hidden="true" />
      {{ opt.label }}
    </label>
  </div>
</template>
