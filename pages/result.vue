<script setup lang="ts">
import { toJpeg } from 'html-to-image'
import type { PaperVariant } from '~/composables/usePaperTheme'
import { DEFAULT_GENDER, isGender } from '~/utils/gender'
import { parseCelebrities } from '~/utils/toneCelebrities'
import { sealColor } from '~/utils/mayaData'
import { type ProfileSection, iconFor, freeProfileSections, premiumProfileSections, countChars } from '~/utils/profileSections'
import { RELATION_DESCRIPTION } from '~/utils/kinRelations'
import { buildSignupLink } from '~/utils/signupLink'

const route = useRoute()
const { user, ready } = useAuth()
const { paper, setPaper } = usePaperTheme()
// 会員登録/ログイン後にこのページへ戻れるよう、有料エリアの各LockedVeilに渡す遷移先。
// name/birth/genderなど現在のクエリを保ったまま/signupへ渡し、登録完了後に
// redirectTarget()経由でこのURLへ戻す(pages/signup.vue・pages/login.vue参照)。name/birth/
// genderは会員登録フォームの入力済み初期値としても使われる(utils/signupLink.ts参照)。
const signupRedirectTo = computed(() => buildSignupLink(route.fullPath, route.query))

const input = computed(() => {
  const genderQuery = route.query.gender as string | undefined
  return {
    name: (route.query.name as string) || 'ゲスト',
    birthdate: (route.query.birth as string) || '1992-10-16',
    gender: genderQuery && isGender(genderQuery) ? genderQuery : DEFAULT_GENDER
  }
})
const { result } = useDiagnosis(input)

const content = useDiagnosisContent({
  sealIndex: computed(() => result.value.sealIndex),
  wavespellSealIndex: computed(() => result.value.wavespellSealIndex),
  toneIndex: computed(() => result.value.toneIndex),
  kin: computed(() => result.value.kin)
})
const sunText = computed(() => content.sunText.value ?? result.value.sun.text)
const wavespellText = computed(() => content.wavespellText.value ?? result.value.wavespell.text)
const toneText = computed(() => content.toneText.value ?? result.value.tone.text)
const sunProfile = computed(() => content.sunProfile.value)
const wavespellProfile = computed(() => content.wavespellProfile.value)
const toneProfile = computed(() => content.toneProfile.value)
// docs/KIN番号診断結果マスタ.xlsx由来、KIN番号1つに対して1本のみの読み物。紋章/音と違って
// 元々ハードコードされたフォールバック文言が無いので、Firestoreにまだ無ければセクション自体を
// 出さない(v-if="kinText" — 下のtemplate参照)。全260件無料公開。
const kinText = computed(() => content.kinText.value)
// KIN別の有名人(docs/芸能人マスタ.xlsx由来)。本文は125文字で切って以降を有料にしているが、
// この一覧はユーザー指定により有料エリアの「後ろ」に無料で全件出す。
const kinCelebrities = computed(() => content.kinCelebrities.value)
function formatCelebrityBirth(birthdate: string) {
  // マスタに生年月日が無い2件は空文字で入っているので、その場合は日付を出さない。
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthdate)
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : ''
}

// 銀河の音プロフィール(docs/銀河の音診断結果マスタ.xlsx由来)の深掘り項目。紋章プロフィールと違い
// 無料/有料の区切りがマスタ側に無いため、全項目を常時無料で表示する。3項目とも純粋な箇条書き。
const toneProfileSections = computed(() => {
  const p = toneProfile.value
  if (!p) return []
  return (
    [
      { label: '基本スペック', items: p.basicSpecs },
      { label: '性格の強み', items: p.strengths },
      { label: '注意するべき点', items: p.cautions }
    ] as { label: string; items?: string[] }[]
  ).filter((s): s is { label: string; items: string[] } => !!s.items?.length)
})
const toneCelebrities = computed(() => parseCelebrities(toneProfile.value?.celebrities))

// 紋章プロフィール(docs/診断結果マスタ.xlsx由来)の深掘り項目。マスタの行構成(1〜14行目=無料、
// 15行目以降=有料)に合わせて分割している。総合解説(sunText/wavespellText)とあなたはこんな人
// (traits)は別枠で常時無料。cautionDetail/cautionDetailPremiumは元々マスタの同一セル
// (row14+15)を1つのフィールドとして結合していたものを分割した経緯があり、「注意すべき傾向」の
// 続きとして premium 側に表示する — 詳細は scripts/characters.data.ts の2026-08-05コメント参照。
// 太陽の紋章・ウェイブスペルは別人格(別キャラクター)なので、それぞれ自分のセクション内で自分の
// プロフィールを深掘りする(2026-08-06以前は両方まとめて「あなたについて」という1セクションに
// していたが、実際には太陽の紋章側のプロフィールしか出せておらず紛らわしかったため分離した)。
const deepUnlocked = computed(() => ready.value && !!user.value)
const sunFreeProfileSections = computed(() => freeProfileSections(sunProfile.value))
const sunPremiumProfileSections = computed(() => premiumProfileSections(sunProfile.value))
const wavespellFreeProfileSections = computed(() => freeProfileSections(wavespellProfile.value))
const wavespellPremiumProfileSections = computed(() => premiumProfileSections(wavespellProfile.value))

// あなたの性格の強みは、あなたはこんな人ですと並べてアーキタイプ画像の右側に配置する
// (モックアップ準拠)。それ以外の無料項目は、画像の下の全幅エリアに続けて表示する。
function findByLabel(sections: ProfileSection[], label: string) {
  return sections.find((s) => s.label === label) ?? null
}
function excludingLabel(sections: ProfileSection[], label: string) {
  return sections.filter((s) => s.label !== label)
}
const sunPersonalityStrength = computed(() => findByLabel(sunFreeProfileSections.value, 'あなたの性格の強み'))
const sunOtherFreeProfileSections = computed(() => excludingLabel(sunFreeProfileSections.value, 'あなたの性格の強み'))
const wavespellPersonalityStrength = computed(() => findByLabel(wavespellFreeProfileSections.value, 'あなたの性格の強み'))
const wavespellOtherFreeProfileSections = computed(() => excludingLabel(wavespellFreeProfileSections.value, 'あなたの性格の強み'))

// KIN番号のあなたへ: 冒頭125文字だけ無料で読ませ、残りは有料エリア(モザイク+「続きを見る」)
// に送る。サロゲートペアの途中で切らないよう[...str]で文字単位に分解してから切っている。
const KIN_LETTER_FREE_CHARS = 125
const kinLetterChars = computed(() => [...(kinText.value ?? '')])
const kinLetterRest = computed(() => kinLetterChars.value.slice(KIN_LETTER_FREE_CHARS).join('').trimStart())
const kinLetterLocked = computed(() => !deepUnlocked.value && kinLetterRest.value.length > 0)
const kinLetterFree = computed(() => {
  if (!kinLetterLocked.value) return kinText.value ?? ''
  // 続きがあるときは参考サイトと同じく三点リーダで「まだ続く」ことを示す。
  return `${kinLetterChars.value.slice(0, KIN_LETTER_FREE_CHARS).join('').trimEnd()}…`
})

// KINの関係性(ガイド/神秘/反対/類似KIN)・運命数字(同じ番号/連番/鏡の向こうの自分/絶対反対KIN)。
// 「同じ番号」「連番」は参照元(マヤDAN)の個別KINページ上に定義が見当たらなかったため、
// ユーザー確認のうえ定義(utils/mayaCalc.ts参照)。
const relations = computed(() => [
  { label: 'ガイドKIN', seal: result.value.relations.guide },
  { label: '神秘KIN', seal: result.value.relations.mystic },
  { label: '反対KIN', seal: result.value.relations.antipode },
  { label: '類似KIN', seal: result.value.relations.analog }
])

const displayBirthdate = computed(() => {
  const d = new Date(input.value.birthdate)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

// SNSシェア。og:image的な動的メタタグはサーバーがない(ssr:false)ため出し分けできないので、
// 代わりにShareHeroCard(画面外に常時マウントした固定サイズの複製カード)をhtml-to-imageで
// PNG化し、Web Share API(navigator.share)にファイルとして渡す — 対応環境(主にモバイル)では
// ネイティブの共有シート経由でX/LINE/Instagram等に画像そのものを渡せる。非対応環境(主に
// デスクトップ)ではダウンロードにフォールバックする。
const shareCardMount = ref<HTMLElement | null>(null)
const sharing = ref(false)
async function shareResult() {
  if (sharing.value) return
  const node = shareCardMount.value?.querySelector<HTMLElement>('.sharecard')
  if (!node) return
  sharing.value = true
  try {
    await document.fonts.ready
    // キャラクター全身像/背景装飾(hero-frame.webp)の<img>・background-imageは、この関数が
    // 呼ばれた時点(=ボタンを押した瞬間)でまだデコード完了していないことがある — ShareHeroCard
    // 自体はページ表示直後からマウントされているが、回線が細い実機では読み込みが間に合わない
    // ケースがあり、その場合html-to-imageは該当箇所を空白のままキャプチャしてしまう
    // (2026-08-24、シェア画像にキャラクター全身像と背景が入らないとユーザー報告・実機のみ
    // 再現、ローカル/デスクトップの高速回線では発生しなかった)。img.decode()で全画像の
    // デコード完了を待ってからキャプチャすることで、読み込みが間に合わないまま撮ってしまう
    // 事態を防ぐ。background-imageのCSS背景(sharecard__bg-top/bottom)はdecode()の対象に
    // できないため、代わりに同じ画像を指す非表示の<img>を明示的に読み込み待ちする
    // (ShareHeroCard側に追加、下記参照)。
    const images = Array.from(node.querySelectorAll('img'))
    await Promise.all(
      images.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve()
      )
    )
    // 背景の装飾フレーム(hero-frame.webp)が加わったことで、可逆圧縮のPNGだと数MB台後半に
    // なってしまう(イラスト全面を再エンコードするため)。共有用途では劣化がほぼ気にならない
    // JPEGにして、ファイルサイズを現実的な範囲に抑えている。
    // html-to-imageのtoBlob()はoptionsのtype/qualityを内部でcanvasToBlobへ渡し忘れており
    // 常にPNGになってしまう(このバージョンのライブラリの既知の実装漏れ、実測で確認済み) —
    // toJpeg()はcanvas.toDataURL('image/jpeg', quality)を正しく使っているためこちらを使い、
    // 返ってきたdata URLをfetchでBlob化する。
    // cacheBust(画像URLにタイムスタンプを付けて毎回再取得させるオプション)は外している —
    // 全て自前バンドルのsame-origin静的アセットで、キャッシュが古くなる/CORSでopaque
    // response化するといった、本来cacheBustが対処する状況が起こらない一方、実機の遅い
    // 回線ではこの強制再取得そのものが遅延・失敗の原因になり得る(上のimg.decode()待ちで
    // 既にブラウザキャッシュ上に確定している画像を、わざわざ無視してもう一度取りに行って
    // しまうため)。外すことで、キャッシュ済みの(=decode()で読み込み確認済みの)画像を
    // そのまま使う。
    // それでもなお実機Safari/WebKitではキャラクター全身像・背景装飾が空白のまま出力される
    // ことをWebKitエンジンでの検証で再現(2026-08-24再報告)。html-to-imageはSVGの
    // foreignObjectにDOMを丸ごと埋め込み、それをcanvasへdrawImageする実装だが、WebKitは
    // このforeignObject内の<img>/background-imageをdrawImage時にラスタライズしないことが
    // ある既知の不具合を持つ(html-to-image/html2canvas共通の既知issue、ライブラリ側の
    // 修正はない)。コミュニティで報告されている回避策が「同じ実行内でキャプチャ関数を
    // 2回呼ぶと1回目は失敗するが2回目は必ず成功する」という挙動のため、ここでも1回目を
    // 捨てて2回撮っている。
    await toJpeg(node, { pixelRatio: 2, quality: 0.92 }).catch(() => {})
    const dataUrl = await toJpeg(node, { pixelRatio: 2, quality: 0.92 })
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `maya-kin${result.value.kin}.jpg`, { type: 'image/jpeg' })
    const shareData = {
      files: [file],
      title: 'JMBマヤ暦 無料診断',
      text: `私のKINは${result.value.kin}、太陽の紋章は${result.value.sun.seal.name}でした。`
    }
    if (navigator.canShare?.(shareData)) {
      await navigator.share(shareData)
    } else {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e) {
    // AbortError = 共有シートをユーザーがキャンセルしただけなので無視する
    if ((e as Error)?.name !== 'AbortError') console.error(e)
  } finally {
    sharing.value = false
  }
}

const demoPapers: { id: PaperVariant; label: string }[] = [
  { id: 'beige', label: 'ベージュ' },
  { id: 'white', label: '白' }
]

// 検証用バー自体の表示・非表示。バーを消した状態で見た目を確認したい場合があるため。
// localStorageに保持するのは、確認のたびにページ遷移/リロードするたびに毎回開き直すのが
// 面倒なため — paperの永続化(usePaperTheme)と同じ考え方。プラン切り替えは実会員登録/
// ログインの導入に伴い廃止した(実ログイン/ログアウトがそのままQA手段になる)。
const DEMO_BAR_KEY = 'maya-demo-bar-hidden'
const demoBarHidden = ref(false)
onMounted(() => {
  if (localStorage.getItem(DEMO_BAR_KEY) === '1') demoBarHidden.value = true
})
function toggleDemoBar() {
  demoBarHidden.value = !demoBarHidden.value
  localStorage.setItem(DEMO_BAR_KEY, demoBarHidden.value ? '1' : '0')
}
</script>

<template>
  <div class="paper-page min-h-screen">
    <IconSprite />

    <div class="sheet sheet--flush">
      <!-- ファーストビュー全体。スマホは1枚の縦長フレーム(.heroframe)で囲み、PCは従来どおり
           上のアーチ(.masthead__arch)と反転した閉じ(.heroclose)の2枚で構成する。1:2のフレームは
           PC幅(最大1180px)だと高さ2360pxになってしまい成立しないため。 -->
      <div class="hero">
        <div class="heroframe" aria-hidden="true" />

      <div class="masthead">
        <div class="masthead__arch" aria-hidden="true" />
        <h1 class="font-display masthead__title">あなたの本質と運勢</h1>
        <p class="masthead__sub">マヤのツォルキン暦から未来のあるべき自分を知ろう</p>
      </div>

      <!-- 生年月日 / KIN / 銀河の音。KINと音の数字は以前この下のヒーロー中央にメダルで
           出していたものをここへ集約した(お名前・性別の表示は廃止)。 -->
      <div class="herostats">
        <div class="numcell">
          <span class="numcell__label">生年月日</span>
          <span class="herostats__date">{{ displayBirthdate }}</span>
        </div>
        <div class="numcell">
          <span class="numcell__label">KIN</span>
          <span class="herostats__num">{{ result.kin }}</span>
        </div>
        <div class="numcell">
          <span class="numcell__label">銀河の音</span>
          <span class="herostats__num">{{ result.toneIndex + 1 }}</span>
        </div>
      </div>

      <!-- モバイルでは.kinduo+.sharebarをまとめてこの中で縦方向センタリングする
           (.hero__body、CSS参照)。デスクトップは.heroがflex columnでないため、
           この包みは単なる無害なblockラッパーとして働く。 -->
      <div class="hero__body">
      <!-- 太陽の紋章 × ウェイブスペル。KIN/音の数字は上のherostatsへ移したので、
           ここは2体のアーキタイプだけを大きく見せる。 -->
      <div class="kinduo">
        <div class="kinduo__art kinduo__art--l"><MayaPortraitFrame :seal-index="result.sealIndex" :gender="result.gender" /></div>
        <div class="kinduo__art kinduo__art--r"><MayaPortraitFrame :seal-index="result.wavespellSealIndex" :gender="result.gender" /></div>
        <div class="kinduo__cap kinduo__cap--l">
          <span class="kinduo__role">太陽の紋章</span>
          <span class="font-display kinduo__seal">{{ result.sun.seal.name }}</span>
        </div>
        <span class="kinduo__x" aria-hidden="true"><svg><use href="#i-cross" /></svg></span>
        <div class="kinduo__cap kinduo__cap--r">
          <span class="kinduo__role">ウェイブスペル</span>
          <span class="font-display kinduo__seal">{{ result.wavespell.seal.name }}</span>
        </div>
      </div>

      <div class="sharebar">
        <button type="button" class="sharebar__btn" :disabled="sharing" @click="shareResult">
          <svg><use href="#i-share" /></svg>
          <span>結果をシェアする</span>
        </button>
      </div>
      </div>

      <!-- ファーストビューの締め。最上部のアーチ装飾(masthead__arch)と同じ画像を上下反転して
           下端に置き、額縁のように閉じる。装飾のみなのでaria-hidden。 -->
      <div class="heroclose" aria-hidden="true" />
      </div>

      <div ref="shareCardMount" class="sharecard-mount" aria-hidden="true">
        <ShareHeroCard
          :birthdate="displayBirthdate"
          :kin="result.kin"
          :tone-index="result.toneIndex"
          :seal-index="result.sealIndex"
          :wavespell-seal-index="result.wavespellSealIndex"
          :gender="result.gender"
          :sun-name="result.sun.seal.name"
          :wavespell-name="result.wavespell.seal.name"
        />
      </div>

      <!-- 太陽の紋章 -->
      <section id="sun" class="section" :data-seal="sealColor(result.sealIndex)">
        <SectionDivider label="太陽の紋章" eyebrow="顕在意識 — 行動を司るアーキタイプ" />
        <div class="dossier">
          <MayaPortrait :seal-index="result.sealIndex" :gender="result.gender" />
          <div class="dossier__main">
            <div class="dossier__headrow">
              <h3 class="font-display dossier__name">{{ result.sun.seal.name }}</h3>
              <span v-if="sunProfile?.archetype" class="dossier__badge">{{ sunProfile.archetype }}</span>
            </div>
            <p v-if="sunProfile?.catchphrase" class="dossier__catch">{{ sunProfile.catchphrase }}</p>

            <div class="dossier__blocks">
              <div v-if="sunProfile?.traits?.length" class="block">
                <div class="block__head"><svg><use :href="`#${iconFor('あなたはこんな人です')}`" /></svg><h3>あなたはこんな人です</h3></div>
                <ul class="checklist">
                  <li v-for="(t, i) in sunProfile.traits" :key="i"><svg><use href="#i-check" /></svg>{{ t }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div v-if="sunPersonalityStrength" class="block dossier__strength">
            <div class="block__head"><svg><use :href="`#${iconFor(sunPersonalityStrength.label)}`" /></svg><h3>{{ sunPersonalityStrength.label }}</h3></div>
            <template v-if="sunPersonalityStrength.kind === 'list-then-text'">
              <ul class="checklist">
                <li v-for="(item, i) in sunPersonalityStrength.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
              </ul>
              <p v-if="sunPersonalityStrength.text">{{ sunPersonalityStrength.text }}</p>
            </template>
          </div>
        </div>

        <div class="block">
          <div class="block__head"><svg><use :href="`#${iconFor('総合解説')}`" /></svg><h3>総合解説</h3></div>
          <p style="white-space: pre-line;">{{ sunText }}</p>
        </div>

        <ProfileBlocks :sections="sunOtherFreeProfileSections" />

        <!-- 有料項目はまとめて1つのモザイクに入れる(項目ごとに小さなロック箱を並べるより、
             「この分量の続きがある」ことが伝わるため)。参考: kinoshita-reon.jp -->
        <ProfileBlocks v-if="deepUnlocked" :sections="sunPremiumProfileSections" />
        <LockedVeil v-else-if="sunPremiumProfileSections.length" :to="signupRedirectTo" :remaining-chars="countChars(sunPremiumProfileSections)" />
      </section>

      <!-- ウェイブスペル -->
      <section id="wavespell" class="section" :data-seal="sealColor(result.wavespellSealIndex)">
        <SectionDivider label="ウェイブスペル" eyebrow="潜在意識 — 可能性を担うアーキタイプ" />
        <div class="dossier">
          <MayaPortrait :seal-index="result.wavespellSealIndex" :gender="result.gender" />
          <div class="dossier__main">
            <div class="dossier__headrow">
              <h3 class="font-display dossier__name">{{ result.wavespell.seal.name }}</h3>
              <span v-if="wavespellProfile?.archetype" class="dossier__badge">{{ wavespellProfile.archetype }}</span>
            </div>
            <p v-if="wavespellProfile?.catchphrase" class="dossier__catch">{{ wavespellProfile.catchphrase }}</p>

            <div class="dossier__blocks">
              <div v-if="wavespellProfile?.traits?.length" class="block">
                <div class="block__head"><svg><use :href="`#${iconFor('あなたはこんな人です')}`" /></svg><h3>あなたはこんな人です</h3></div>
                <ul class="checklist">
                  <li v-for="(t, i) in wavespellProfile.traits" :key="i"><svg><use href="#i-check" /></svg>{{ t }}</li>
                </ul>
              </div>
            </div>
          </div>
          <div v-if="wavespellPersonalityStrength" class="block dossier__strength">
            <div class="block__head"><svg><use :href="`#${iconFor(wavespellPersonalityStrength.label)}`" /></svg><h3>{{ wavespellPersonalityStrength.label }}</h3></div>
            <template v-if="wavespellPersonalityStrength.kind === 'list-then-text'">
              <ul class="checklist">
                <li v-for="(item, i) in wavespellPersonalityStrength.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
              </ul>
              <p v-if="wavespellPersonalityStrength.text">{{ wavespellPersonalityStrength.text }}</p>
            </template>
          </div>
        </div>

        <div class="block">
          <div class="block__head"><svg><use :href="`#${iconFor('総合解説')}`" /></svg><h3>総合解説</h3></div>
          <p style="white-space: pre-line;">{{ wavespellText }}</p>
        </div>

        <ProfileBlocks :sections="wavespellOtherFreeProfileSections" />

        <ProfileBlocks v-if="deepUnlocked" :sections="wavespellPremiumProfileSections" />
        <LockedVeil v-else-if="wavespellPremiumProfileSections.length" :to="signupRedirectTo" :remaining-chars="countChars(wavespellPremiumProfileSections)" />
      </section>

      <!-- 銀河の音 -->
      <section id="tone" class="section">
        <SectionDivider label="銀河の音" eyebrow="260日の周期が示すリズム" />
        <div class="tonecard">
          <div class="tonecard__left">
            <GoldMedal :value="result.toneIndex + 1" :size="92" :num-font-size="38" />
            <div class="tonecard__eyebrow">GALACTIC TONE</div>
            <h3 class="font-display tonecard__name">{{ result.tone.info.name }}</h3>
          </div>
          <div class="tonecard__body">
            <p v-if="toneProfile?.title" class="mb-1.5" style="color: var(--gold-deep); font-size: 13px; font-weight: 600;">{{ toneProfile.title }}</p>
            <p class="tonecard__desc">{{ toneText }}</p>
          </div>
        </div>

        <div v-for="s in toneProfileSections" :key="s.label" class="block">
          <div class="block__head"><svg><use :href="`#${iconFor(s.label)}`" /></svg><h3>{{ s.label }}</h3></div>
          <ul class="checklist">
            <li v-for="(item, i) in s.items" :key="i"><svg><use href="#i-check" /></svg>{{ item }}</li>
          </ul>
        </div>

        <div v-if="toneCelebrities.length" class="block">
          <div class="block__head"><svg><use href="#i-trophy" /></svg><h3>同じ音を持つ有名人</h3></div>
          <ul class="celeblist">
            <li v-for="c in toneCelebrities" :key="c.name + c.kin">{{ c.name }}<span>（{{ c.combo }}）</span></li>
          </ul>
        </div>
      </section>

      <!-- KIN番号のあなたへ: docs/KIN番号診断結果マスタ.xlsx由来、個別要素(紋章/音)ではなくKIN
           全体への語りかけなので、内訳を読んだ後・関係性データの前に置く。冒頭125文字が無料、
           残りは有料エリア(KIN_LETTER_FREE_CHARS参照)。 -->
      <section v-if="kinText" class="section">
        <SectionDivider :label="`KIN${result.kin}のあなたへ`" eyebrow="紋章や音を超えた、あなたへの言葉" numeric />
        <p class="kinletter">{{ kinLetterFree }}</p>
        <LockedVeil v-if="kinLetterLocked" class="kinletter-gate" :to="signupRedirectTo" :remaining-chars="kinLetterRest.length" />

        <!-- 同じKINを持つ有名人。有料エリアより後ろに置き、無料/有料を問わず全件表示する。 -->
        <div v-if="kinCelebrities.length" class="block">
          <div class="block__head"><svg><use href="#i-trophy" /></svg><h3>同じKINを持つ有名人</h3></div>
          <ul class="celeblist celeblist--kin">
            <li v-for="c in kinCelebrities" :key="c.name + c.birthdate">
              {{ c.name }}<span>{{ c.field }}<template v-if="formatCelebrityBirth(c.birthdate)"> ｜ {{ formatCelebrityBirth(c.birthdate) }}</template></span>
            </li>
          </ul>
        </div>
      </section>

      <!-- KINの関係性: 無料 -->
      <section id="relations" class="section">
        <SectionDivider label="KINの関係性" eyebrow="周囲の紋章とのつながり" />
        <div class="relwrap">
          <div v-for="r in relations" :key="r.label" class="relcard" :class="`relcard--${sealColor(r.seal.index)}`">
            <div class="relcard__figure"><MayaBust :seal-index="r.seal.index" :alt="r.seal.name" :gender="result.gender" /></div>
            <div class="relcard__body">
              <span class="relcard__label">{{ r.label }}</span>
              <h3 class="font-display relcard__name">{{ r.seal.name }}</h3>
              <p class="relcard__desc">{{ RELATION_DESCRIPTION[r.label] }}</p>
              <NuxtLink
                :to="{ path: `/kin/${r.seal.index}`, query: { label: r.label, name: result.name, birth: input.birthdate, gender: result.gender } }"
                class="relcard__cta"
              ><span class="relcard__cta-icon"><svg><use href="#i-search" /></svg></span>詳しく見る</NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <!-- 運命数字: 無料、番号のみ -->
      <section id="destiny" class="section">
        <SectionDivider label="運命数字" eyebrow="同じ周期を巡るKIN番号" />
        <div class="numrow">
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.sameNumberKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">同じKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.prevKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">前のKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.nextKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">次のKIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.mirrorKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">鏡の向こうの自分KIN</span>
          </div>
          <div class="numcell">
            <GoldMedal :value="result.destinyNumbers.absoluteOppositeKin" :size="68" :num-font-size="20" />
            <span class="numcell__label">絶対反対KIN</span>
          </div>
        </div>
      </section>

      <!-- 相性診断への導線: 無料機能、ゲート無し -->
      <section id="compatibility-cta" class="section">
        <div class="mx-auto max-w-[560px] rounded-xl p-6 text-center" style="border: 1px solid var(--gold-line-soft); background: var(--paper-panel); box-shadow: var(--shadow);">
          <div class="mb-2 font-display text-[17px]" style="color: var(--gold-deep);">身近な人との相性を無料で診断</div>
          <p class="mb-4 text-[13px]" style="color: var(--ink-soft);">パートナーや友人の生年月日を入れるだけで、紋章の組み合わせから相性を読み解きます。</p>
          <NuxtLink
            :to="{ path: '/compatibility', query: { name: result.name, birth: input.birthdate, gender: result.gender } }"
            class="inline-block rounded-full px-6.5 py-2.5 text-[13.5px] font-semibold"
            style="border: 1px solid var(--gold); color: var(--gold-deep);"
          >
            相性診断をはじめる
          </NuxtLink>
        </div>
      </section>

      <p class="foot">
        古代4000年の智慧 JMBマヤ暦 無料診断 ｜ {{ !user ? '監修者紹介・占術紹介・利用規約はフッターメニューより' : '会員としてご利用中です' }}
      </p>
    </div>

    <!-- Demo-only toggle: 紙面テーマ(ベージュ/白)は永続化されたグローバル設定
         (usePaperTheme)なので、/compatibilityもここで選んだ内容をそのまま引き継ぐ。
         プラン切り替えボタンは実会員登録/ログインの導入に伴い廃止(実ログイン/ログアウト
         がそのままQA手段になるため)。 -->
    <!-- backdrop-blur は使わない: position:fixed と組み合わせると、スクロールの毎フレーム
         「背後のページを読み直してぼかす」処理が走り、スマホでスクロールが引っかかる原因に
         なる。背景を不透明にすれば見た目はほぼ同じで、その処理自体が不要になる。 -->
    <div
      v-if="!demoBarHidden"
      class="fixed inset-x-4 bottom-4 z-40 flex flex-wrap items-center justify-center gap-2.5 rounded-2xl py-2.5 pl-3.5 pr-6.5 text-xs shadow-lg sm:inset-x-auto sm:right-4 sm:flex-nowrap sm:rounded-full"
      style="border: 1px solid var(--gold-line); background: var(--paper-panel); color: var(--ink-soft);"
    >
      <span class="whitespace-nowrap">検証用：</span>
      <div class="switch">
        <button v-for="p in demoPapers" :key="p.id" :aria-pressed="paper === p.id" @click="setPaper(p.id)">{{ p.label }}</button>
      </div>
      <button
        type="button"
        class="demobar__close"
        aria-label="検証用バーを隠す"
        title="検証用バーを隠す"
        @click="toggleDemoBar"
      >×</button>
    </div>
    <!-- バーを隠している間の再表示ボタン。同じ隅に、目立たない小さな丸ボタンとして常時置く
         — 隠したまま二度と出せなくなるのを避けるため。 -->
    <button
      v-else
      type="button"
      class="demobar__reopen"
      aria-label="検証用バーを表示する"
      title="検証用バーを表示する"
      @click="toggleDemoBar"
    >検証用</button>
  </div>
</template>
