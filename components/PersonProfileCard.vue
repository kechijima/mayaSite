<script setup lang="ts">
import type { PersonProfile } from '~/composables/useCompatibility'
import { genderLabel } from '~/utils/gender'
import { sealColor } from '~/utils/mayaData'

const props = defineProps<{ profile: PersonProfile }>()

const displayBirthdate = computed(() => {
  const d = new Date(props.profile.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
const displayGender = computed(() => genderLabel(props.profile.gender))
const who = computed(() => (props.profile.id === 'self' ? 'あなた' : `${props.profile.name}さん`))
</script>

<template>
  <!-- 2026-11-22 要望: mayadan.jp/congeniality/result を参考に、1人1枚を横幅いっぱいに使い、
       太陽の紋章・ウェイブスペルを丸いアイコンではなく大きな胸像(MayaBust)で出す。
       PC は 太陽の紋章・ウェイブスペル・銀河の音 の3列、スマホは胸像2つを横に並べ、銀河の音はその下。
       胸像の後ろには紋章色のぼかしを敷く(mayadan と同じく人物を浮き立たせる)。 -->
  <div class="ppcard">
    <p class="ppcard__lead">{{ displayBirthdate }}生まれの<strong>{{ who }}</strong>は</p>
    <p class="ppcard__kin"><small>KIN</small>{{ profile.kin }}</p>
    <p class="ppcard__meta">{{ displayGender }}</p>

    <div class="ppcard__figs">
      <div class="ppcard__fig" :style="{ '--c': `var(--seal-${sealColor(profile.sealIndex)})` }">
        <div class="ppcard__label">太陽の紋章</div>
        <div class="ppcard__img"><MayaBust :seal-index="profile.sealIndex" :gender="profile.gender" :alt="profile.sun.seal.name" /></div>
        <h4 class="font-display ppcard__name">{{ profile.sun.seal.name }}</h4>
      </div>
      <div class="ppcard__fig" :style="{ '--c': `var(--seal-${sealColor(profile.wavespellSealIndex)})` }">
        <div class="ppcard__label">ウェイブスペル</div>
        <div class="ppcard__img"><MayaBust :seal-index="profile.wavespellSealIndex" :gender="profile.gender" :alt="profile.wavespell.seal.name" /></div>
        <h4 class="font-display ppcard__name">{{ profile.wavespell.seal.name }}</h4>
      </div>
      <div class="ppcard__fig ppcard__tone">
        <div class="ppcard__label">銀河の音</div>
        <div class="ppcard__medal ppcard__medal--lg"><GoldMedal :value="profile.toneIndex + 1" :size="150" :num-font-size="56" /></div>
        <div class="ppcard__medal ppcard__medal--sm"><GoldMedal :value="profile.toneIndex + 1" :size="72" :num-font-size="27" /></div>
        <h4 class="font-display ppcard__name">{{ profile.tone.info.name }}</h4>
      </div>
    </div>

    <!-- 運命数字: KINの関係性(ガイド/反対/神秘/類似KIN)は紋章名、鏡の向こうの自分/絶対反対KINは番号。
         前者と後者は別グループなので<ul>を分けて間を空ける。 -->
    <div class="ppcard__rels">
      <ul>
        <li><span>ガイドKIN</span><b>{{ profile.relations.guide.name }}</b></li>
        <li><span>反対KIN</span><b>{{ profile.relations.antipode.name }}</b></li>
        <li><span>神秘KIN</span><b>{{ profile.relations.mystic.name }}</b></li>
        <li><span>類似KIN</span><b>{{ profile.relations.analog.name }}</b></li>
      </ul>
      <ul>
        <li><span>鏡の向こうの自分KIN</span><b>KIN {{ profile.mirrorKin }}</b></li>
        <li><span>絶対反対KIN</span><b>KIN {{ profile.absoluteOppositeKin }}</b></li>
      </ul>
    </div>
  </div>
</template>
