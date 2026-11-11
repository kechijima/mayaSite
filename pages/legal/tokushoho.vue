<script setup lang="ts">
// 特定商取引法に基づく表記。項目は mayadan.jp/law(販売業者・販売責任者・所在地・連絡先・
// 販売価格・必要料金・引渡し時期・支払方法・キャンセル)を土台に、このサイトはデジタル
// コンテンツの継続課金なので「お支払い時期」「解約」「動作環境」を足している。
// 運営者名・連絡先は utils/legalInfo.ts、価格は utils/checkout.ts の PLANS から取る。
import { OPERATOR } from '~/utils/legalInfo'
import { PLANS, formatYen } from '~/utils/checkout'

const ITEMS: { label: string; value: string }[] = [
  { label: '販売業者', value: OPERATOR.name },
  { label: '運営統括責任者', value: OPERATOR.representative },
  { label: '所在地', value: OPERATOR.address },
  { label: '電話番号', value: OPERATOR.phone },
  { label: 'メールアドレス', value: OPERATOR.email },
  {
    label: '販売価格',
    value: `有料会員：月額 ${formatYen(PLANS.subscription.price)}（税込）\n記事の単体購入：1記事 ${formatYen(PLANS.single.price)}（税込）`
  },
  { label: '商品代金以外の必要料金', value: 'インターネット接続料金・通信料金はお客様のご負担となります。' },
  { label: 'お支払い方法', value: 'クレジットカード' },
  {
    label: 'お支払い時期',
    value: '有料会員：お申し込み時に初月分をお支払いいただき、以降は毎月の更新日に自動で決済されます。\n記事の単体購入：ご購入時にお支払いいただきます。'
  },
  { label: 'サービスの提供時期', value: 'お支払い手続きの完了後、ただちにご覧いただけます。' },
  {
    label: '返品・キャンセル',
    value: 'デジタルコンテンツの性質上、お支払い後の返品・キャンセル・返金はお受けしておりません。ただし、当方の不具合により有料コンテンツをご覧いただけなかった場合は、メールにてご連絡ください。'
  },
  {
    label: '有料会員の解約',
    value: 'マイページからいつでも解約の手続きを行えます。月の途中で解約された場合も、日割りでの返金はいたしません。'
  },
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

      <div class="mx-auto mt-8 max-w-[720px]">
        <section class="panel">
          <dl class="legallist">
            <div v-for="item in ITEMS" :key="item.label">
              <dt>{{ item.label }}</dt>
              <dd class="whitespace-pre-line">{{ item.value }}</dd>
            </div>
          </dl>
        </section>
        <LegalLinks />
      </div>
    </div>
  </div>
</template>
