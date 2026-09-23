<script setup lang="ts">
// 特定商取引法に基づく表記。決済導入時に必要になる法定表示の雛形で、項目名だけ先に置いてある
// (内容は未決定 — CLAUDE.md「Payment roadmap (Phase 2)」の「Still undecided」)。
// 値を埋めるときはこの配列を書き換えるだけでよい。
const ITEMS: { label: string; value: string }[] = [
  { label: '販売業者', value: '（準備中）' },
  { label: '運営統括責任者', value: '（準備中）' },
  { label: '所在地', value: '（準備中）' },
  { label: '電話番号', value: '（準備中）' },
  { label: 'メールアドレス', value: '（準備中）' },
  { label: '販売価格', value: '有料会員 月額 5,500円（税込）／記事の単体購入 550円（税込）' },
  { label: '商品代金以外の必要料金', value: 'インターネット接続料金・通信料金はお客様のご負担となります。' },
  { label: 'お支払い方法', value: 'クレジットカード（準備中）' },
  { label: 'お支払い時期', value: '有料会員: お申し込み時および毎月の更新日／単体購入: ご購入時' },
  { label: 'サービスの提供時期', value: 'お支払い完了後、ただちにご利用いただけます。' },
  { label: '返品・キャンセルについて', value: 'デジタルコンテンツの性質上、お支払い後の返金はお受けしておりません。有料会員の解約はマイページからいつでも行えます（準備中）。' },
  { label: '動作環境', value: '最新のブラウザ（Safari / Chrome / Edge / Firefox）を推奨します。' }
]
</script>

<template>
  <div class="paper-page">
    <div class="sheet">
      <div class="masthead masthead--plain">
        <span class="masthead__eyebrow">LEGAL</span>
        <h1 class="font-display masthead__title">特定商取引法に基づく表記</h1>
      </div>

      <div class="mx-auto mt-8 max-w-[640px]">
        <section class="panel">
          <dl class="legallist">
            <div v-for="item in ITEMS" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd>{{ item.value }}</dd>
            </div>
          </dl>
        </section>
        <NuxtLink to="/" class="mt-6 block text-center text-[12px] hover:underline" style="color: var(--ink-faint);">
          トップへ戻る
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
