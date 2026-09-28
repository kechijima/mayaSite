// チーム会員向けの到達度テスト。マヤ暦の基礎(紋章・音・KINの読み方・関係性)が身についたかを
// 4択で確かめる。問題は Firestore に置かず、このファイルが SEALS / TONES / kinInfo() から
// その場で生成する — 出題の正はサイトの診断と同じ計算式なので、作問と採点がずれない。
//
// 級は3つ(初級 → 中級 → 上級)だが、受験の順序も回数も縛らない(2026-09-28 の合意: 制限なし、
// 合格しても特典は付けない)。結果は users/{uid}/testResults に1回ぶんずつ残し、本人は
// /test で、管理者は /admin/users/[uid] と /admin/teams/[teamId] で見る。
//
// scripts/ から tsx で読めるよう、~/ ではなく相対 import にしている(utils/compatibility.ts と同じ)。
import { SEALS, TONES, sealColor, type SealColor } from './mayaData'
import { dateToKin, kinInfo } from './mayaCalc'
import { RELATION_DESCRIPTION } from './kinRelations'

export type TestLevel = 'basic' | 'intermediate' | 'advanced'

export const TEST_LEVELS: TestLevel[] = ['basic', 'intermediate', 'advanced']

export const TEST_LEVEL_LABEL: Record<TestLevel, string> = {
  basic: '初級',
  intermediate: '中級',
  advanced: '上級'
}

export const TEST_LEVEL_TITLE: Record<TestLevel, string> = {
  basic: '紋章と音の基礎',
  intermediate: 'KINの読み方',
  advanced: 'KINの関係性'
}

export const TEST_LEVEL_DESCRIPTION: Record<TestLevel, string> = {
  basic: '20の紋章の名前・色・キーワードと、13の銀河の音のはたらきを問います。',
  intermediate: '生年月日からKINを求め、KINから紋章・銀河の音・ウェイブスペルを読み取れるかを問います。',
  advanced: 'ガイド・神秘・反対・類似KINの紋章と意味、鏡の向こうの自分KIN・絶対反対KINの番号を問います。'
}

// 1回の出題数と合格ライン。合格に特典は無いが、「身についたか」の目安として結果画面と
// 管理画面に合否を出す(2026-09-28)。
export const QUESTIONS_PER_TEST = 10
export const PASS_RATIO = 0.8

export function isTestLevel(value: unknown): value is TestLevel {
  return typeof value === 'string' && (TEST_LEVELS as string[]).includes(value)
}

export function isPassing(score: number, total: number): boolean {
  return total > 0 && score / total >= PASS_RATIO
}

export interface TestQuestion {
  // 何を問う問題か。管理画面での表示と、同じ種類の問題が続きすぎないための調整に使う。
  kind: string
  prompt: string
  choices: string[]
  answerIndex: number
  // 回答直後に出す一言。SEALS/TONES のキーワードや関係性の説明文をそのまま使う。
  explanation: string
}

// 保存する1問ぶん。出題内容ごと残すので、管理者は「何を問われて何と答えたか」まで追える。
export interface AnsweredQuestion extends TestQuestion {
  selectedIndex: number
}

export interface TestResultDoc {
  level: TestLevel
  score: number
  total: number
  passed: boolean
  answers: AnsweredQuestion[]
  takenAt: unknown // serverTimestamp() で書き、読むときは Timestamp
}

// ---- 乱数まわり ----
// 依存を持たない小さなユーティリティ。テストで固定したいときは rng を差し替えられるようにしてある。
export type Rng = () => number

function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n)
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 正解1つ + 誤答3つを混ぜ、正解の位置を返す。誤答は候補から重複なく引く。
function buildChoices(rng: Rng, answer: string, pool: string[]): { choices: string[]; answerIndex: number } {
  const distractors = shuffle(rng, pool.filter((p) => p !== answer)).slice(0, 3)
  const choices = shuffle(rng, [answer, ...distractors])
  return { choices, answerIndex: choices.indexOf(answer) }
}

const SEAL_NAMES = SEALS.map((s) => s.name)
const TONE_NAMES = TONES.map((t) => t.name)
const TONE_KEYWORDS = TONES.map((t) => t.keyword)
const SEAL_KEYWORDS = SEALS.map((s) => s.keyword)

const COLOR_LABEL: Record<SealColor, string> = { red: '赤い', white: '白い', blue: '青い', yellow: '黄色い' }
const COLOR_LABELS = Object.values(COLOR_LABEL)

// 生年月日の問題に使う日付。1950〜2010年の中から適当な1日を引く。
// 月末や 2/29 の扱いは dateToKin() に任せる(早見表方式の仕様どおり)。
function randomBirthdate(rng: Rng): Date {
  const year = 1950 + randInt(rng, 61)
  const month = randInt(rng, 12)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, 1 + randInt(rng, daysInMonth))
}

function formatDateJa(d: Date): string {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

// KIN番号の誤答候補。近い数字と、紋章か音だけが同じ数字を混ぜて「なんとなく」では選べないようにする。
function kinDistractorPool(kin: number): string[] {
  const near = [-1, 1, -2, 2, -13, 13, -20, 20, -40, 40, -52, 52, 130]
  const set = new Set<number>()
  for (const d of near) {
    const k = ((kin - 1 + d) % 260 + 260) % 260 + 1
    if (k !== kin) set.add(k)
  }
  return [...set].map((k) => `KIN ${k}`)
}

// ---- 出題(級ごと) ----
// 各関数は1問返す。generateTest() が種類を回して QUESTIONS_PER_TEST 問そろえる。
type QuestionMaker = (rng: Rng) => TestQuestion

const basicMakers: QuestionMaker[] = [
  // キーワード → 紋章名
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const { choices, answerIndex } = buildChoices(rng, SEALS[i].name, SEAL_NAMES)
    return {
      kind: '紋章のキーワード',
      prompt: `「${SEALS[i].keyword}」をキーワードに持つ紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `${SEALS[i].name}（${SEALS[i].english}）のキーワードは「${SEALS[i].keyword}」です。`
    }
  },
  // 紋章名 → 色
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const color = COLOR_LABEL[sealColor(i)]
    const { choices, answerIndex } = buildChoices(rng, color, COLOR_LABELS)
    return {
      kind: '紋章の色',
      prompt: `「${SEALS[i].name}」の色はどれですか。`,
      choices: choices.map((c) => `${c}紋章`),
      answerIndex,
      explanation: `紋章は 赤 → 白 → 青 → 黄 の順にくり返します。${SEALS[i].name}は ${i + 1} 番目なので${color}紋章です。`
    }
  },
  // 紋章名 → キーワード
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const { choices, answerIndex } = buildChoices(rng, SEALS[i].keyword, SEAL_KEYWORDS)
    return {
      kind: '紋章のキーワード',
      prompt: `「${SEALS[i].name}」のキーワードはどれですか。`,
      choices,
      answerIndex,
      explanation: SEALS[i].essence
    }
  },
  // 音の名前 → はたらき
  (rng) => {
    const i = randInt(rng, TONES.length)
    const { choices, answerIndex } = buildChoices(rng, TONES[i].keyword, TONE_KEYWORDS)
    return {
      kind: '銀河の音',
      prompt: `「${TONES[i].name}」（音${i + 1}）が表す力はどれですか。`,
      choices,
      answerIndex,
      explanation: `${TONES[i].name}（${TONES[i].english}）は「${TONES[i].keyword}」を表します。`
    }
  },
  // 音の番号 → 名前
  (rng) => {
    const i = randInt(rng, TONES.length)
    const { choices, answerIndex } = buildChoices(rng, TONES[i].name, TONE_NAMES)
    return {
      kind: '銀河の音',
      prompt: `銀河の音「${i + 1}」の名前はどれですか。`,
      choices,
      answerIndex,
      explanation: `音${i + 1}は「${TONES[i].name}」、${TONES[i].keyword}を表します。`
    }
  }
]

const intermediateMakers: QuestionMaker[] = [
  // 生年月日 → KIN
  (rng) => {
    const d = randomBirthdate(rng)
    const kin = dateToKin(d)
    const { choices, answerIndex } = buildChoices(rng, `KIN ${kin}`, kinDistractorPool(kin))
    const info = kinInfo(kin)
    return {
      kind: 'KINの算出',
      prompt: `${formatDateJa(d)}生まれの人のKINはどれですか。`,
      choices,
      answerIndex,
      explanation: `${formatDateJa(d)}は KIN ${kin}（${SEALS[info.sealIndex].name}・${TONES[info.toneIndex].name}）です。`
    }
  },
  // KIN → 太陽の紋章
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.sealIndex].name, SEAL_NAMES)
    return {
      kind: 'KINと紋章',
      prompt: `KIN ${kin} の太陽の紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `紋章は KIN を 20 で割った余りで決まります。KIN ${kin} は ${info.sealIndex + 1} 番目の「${SEALS[info.sealIndex].name}」です。`
    }
  },
  // KIN → 銀河の音
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, TONES[info.toneIndex].name, TONE_NAMES)
    return {
      kind: 'KINと音',
      prompt: `KIN ${kin} の銀河の音はどれですか。`,
      choices,
      answerIndex,
      explanation: `音は KIN を 13 で割った余りで決まります。KIN ${kin} は音${info.toneIndex + 1}「${TONES[info.toneIndex].name}」です。`
    }
  },
  // KIN → ウェイブスペル
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.wavespellSealIndex].name, SEAL_NAMES)
    const start = kin - info.toneIndex
    return {
      kind: 'ウェイブスペル',
      prompt: `KIN ${kin} のウェイブスペル（13日間の周期を開く紋章）はどれですか。`,
      choices,
      answerIndex,
      explanation: `KIN ${kin} は音${info.toneIndex + 1}なので、周期は KIN ${start} から始まります。KIN ${start} の紋章「${SEALS[info.wavespellSealIndex].name}」がウェイブスペルです。`
    }
  }
]

const RELATION_NAMES = Object.keys(RELATION_DESCRIPTION)

const advancedMakers: QuestionMaker[] = [
  // 紋章 → 反対KIN
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const info = kinInfo(i + 1)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.antipodeSealIndex].name, SEAL_NAMES)
    return {
      kind: '反対KIN',
      prompt: `「${SEALS[i].name}」の反対KINの紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `反対KINは 10 番先の紋章です。${SEALS[i].name}の反対KINは「${SEALS[info.antipodeSealIndex].name}」。${RELATION_DESCRIPTION['反対KIN']}`
    }
  },
  // 紋章 → 神秘KIN
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const info = kinInfo(i + 1)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.mysticSealIndex].name, SEAL_NAMES)
    return {
      kind: '神秘KIN',
      prompt: `「${SEALS[i].name}」の神秘KINの紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `神秘KINは番号を足すと 21 になる紋章です（${i + 1} + ${info.mysticSealIndex + 1}）。${SEALS[i].name}の神秘KINは「${SEALS[info.mysticSealIndex].name}」。${RELATION_DESCRIPTION['神秘KIN']}`
    }
  },
  // 紋章 → 類似KIN
  (rng) => {
    const i = randInt(rng, SEALS.length)
    const info = kinInfo(i + 1)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.analogSealIndex].name, SEAL_NAMES)
    return {
      kind: '類似KIN',
      prompt: `「${SEALS[i].name}」の類似KINの紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `類似KINは番号を足すと 19 になる紋章です（${i + 1} + ${info.analogSealIndex + 1}。19 を超えるときは 39）。${SEALS[i].name}の類似KINは「${SEALS[info.analogSealIndex].name}」。${RELATION_DESCRIPTION['類似KIN']}`
    }
  },
  // KIN → ガイドKIN(音で変わる)
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, SEALS[info.guideSealIndex].name, SEAL_NAMES)
    return {
      kind: 'ガイドKIN',
      prompt: `KIN ${kin}（${SEALS[info.sealIndex].name}・音${info.toneIndex + 1}）のガイドKINの紋章はどれですか。`,
      choices,
      answerIndex,
      explanation: `ガイドKINは紋章と音の組み合わせで決まります（音1・6・11は自分の紋章）。KIN ${kin} のガイドKINは「${SEALS[info.guideSealIndex].name}」。${RELATION_DESCRIPTION['ガイドKIN']}`
    }
  },
  // 説明文 → 関係性の名前
  (rng) => {
    const name = RELATION_NAMES[randInt(rng, RELATION_NAMES.length)]
    const { choices, answerIndex } = buildChoices(rng, name, RELATION_NAMES)
    return {
      kind: '関係性の意味',
      prompt: `次の説明にあてはまる関係はどれですか。\n「${RELATION_DESCRIPTION[name]}」`,
      choices,
      answerIndex,
      explanation: `これは「${name}」の説明です。`
    }
  },
  // KIN → 鏡の向こうの自分KIN
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, `KIN ${info.mirrorKin}`, [...kinDistractorPool(info.mirrorKin), `KIN ${info.absoluteOppositeKin}`])
    return {
      kind: '鏡の向こうの自分KIN',
      prompt: `KIN ${kin} の「鏡の向こうの自分KIN」はどれですか。`,
      choices,
      answerIndex,
      explanation: `鏡の向こうの自分KINは 261 から引いた番号です。261 − ${kin} = ${info.mirrorKin}。`
    }
  },
  // KIN → 絶対反対KIN
  (rng) => {
    const kin = 1 + randInt(rng, 260)
    const info = kinInfo(kin)
    const { choices, answerIndex } = buildChoices(rng, `KIN ${info.absoluteOppositeKin}`, [...kinDistractorPool(info.absoluteOppositeKin), `KIN ${info.mirrorKin}`])
    return {
      kind: '絶対反対KIN',
      prompt: `KIN ${kin} の「絶対反対KIN」はどれですか。`,
      choices,
      answerIndex,
      explanation: `絶対反対KINは 130 離れた番号です（260 を超えたら 260 を引く）。KIN ${kin} の絶対反対KINは KIN ${info.absoluteOppositeKin}。`
    }
  }
]

const MAKERS: Record<TestLevel, QuestionMaker[]> = {
  basic: basicMakers,
  intermediate: intermediateMakers,
  advanced: advancedMakers
}

// 1回ぶんの問題を作る。種類を順番に回してから並べ替えるので、10問の中で各種類が
// ほぼ均等に出る。同じ問い(prompt)が2回出たら引き直す。
export function generateTest(level: TestLevel, rng: Rng = Math.random): TestQuestion[] {
  const makers = MAKERS[level]
  const questions: TestQuestion[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (questions.length < QUESTIONS_PER_TEST && attempts < QUESTIONS_PER_TEST * 20) {
    const maker = makers[attempts % makers.length]
    attempts++
    const q = maker(rng)
    if (seen.has(q.prompt)) continue
    seen.add(q.prompt)
    questions.push(q)
  }
  return shuffle(rng, questions)
}

export function scoreAnswers(answers: AnsweredQuestion[]): number {
  return answers.filter((a) => a.selectedIndex === a.answerIndex).length
}
