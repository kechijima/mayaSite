<script setup lang="ts">
// 管理画面の一覧テーブルを lg(1024px)未満でカードに置き換えるときの1件ぶん。
// テーブル側は `hidden lg:block`、カード一覧(<ul>)側は `lg:hidden` にして、同じデータを
// 両方の形で描画する(横スクロールのテーブルはスマホで見づらいという要望による)。
//
// - `to` を渡すとカード全体が NuxtLink、`clickable` なら button になり、click を emit する。
//   テーブルの「詳細」ボタンや行クリックの代わりにカード全体をタップ対象にする。
// - `fields` は下段の dl に「ラベル / 値」で並ぶ。チップやボタンは badge / actions スロットで。
import { NuxtLink } from '#components'

defineProps<{
  title: string
  subtitle?: string
  fields?: { label: string; value: string }[]
  to?: string
  clickable?: boolean
}>()
defineEmits<{ click: [] }>()
</script>

<template>
  <li class="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
    <component
      :is="to ? NuxtLink : clickable ? 'button' : 'div'"
      :to="to || undefined"
      :type="!to && clickable ? 'button' : undefined"
      class="flex w-full flex-col py-3 text-left text-[13px]"
      :class="to || clickable ? 'active:bg-slate-50 dark:active:bg-slate-800/40' : ''"
      @click="clickable && !to ? $emit('click') : undefined"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold">{{ title }}</p>
          <p v-if="subtitle" class="break-all text-[12px] text-slate-500 dark:text-slate-400">{{ subtitle }}</p>
        </div>
        <div v-if="$slots.badge" class="flex flex-none flex-wrap justify-end gap-1.5">
          <slot name="badge" />
        </div>
      </div>
      <dl v-if="fields?.length" class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
        <div v-for="f in fields" :key="f.label" class="min-w-0">
          <dt class="text-[10.5px] uppercase tracking-wide text-slate-400">{{ f.label }}</dt>
          <dd class="break-words tabular-nums">{{ f.value }}</dd>
        </div>
      </dl>
      <div v-if="$slots.actions" class="mt-2.5 flex flex-wrap gap-2">
        <slot name="actions" />
      </div>
    </component>
  </li>
</template>
