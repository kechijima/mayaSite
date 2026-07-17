export interface Seal {
  name: string
  english: string
  keyword: string
  essence: string
}

export interface Tone {
  name: string
  english: string
  keyword: string
}

// 20 day-signs (紋章). Order + 4-color cycle (赤/白/青/黄) follows the
// traditional Tzolkin sequence used by Dreamspell-style calendars.
export const SEALS: Seal[] = [
  { name: '赤い龍', english: 'Red Dragon', keyword: '育む力・存在の土台', essence: '赤い龍を紋章に持つ人は、周囲を安心させる母性的な存在感を持ち、物事の土台を育むことに長けています。' },
  { name: '白い風', english: 'White Wind', keyword: '伝達力・柔軟性', essence: '白い風を紋章に持つ人は、言葉や感性を通じて人と人をつなぐ力を秘め、場の空気を敏感に読み取ります。' },
  { name: '青い夜', english: 'Blue Night', keyword: '直感・豊かさへの感受性', essence: '青い夜を紋章に持つ人は、内なる直感と豊かさへの感受性が強く、静けさの中で本質を見極めます。' },
  { name: '黄色い種', english: 'Yellow Seed', keyword: '探求心・可能性を開く力', essence: '黄色い種を紋章に持つ人は、尽きない探求心を持ち、自分にも他人にも眠る可能性を開花させる力があります。' },
  { name: '赤い蛇', english: 'Red Serpent', keyword: '生命力・情熱', essence: '赤い蛇を紋章に持つ人は、瞬発力と情熱に満ち、危機を乗り越える強い生命力を備えています。' },
  { name: '白い世界の橋渡し', english: 'White Worldbridger', keyword: '橋渡し・手放す力', essence: '白い世界の橋渡しを紋章に持つ人は、異なる立場をつなぐ橋渡し役となり、不要なものを手放す潔さがあります。' },
  { name: '青い手', english: 'Blue Hand', keyword: '実践力・癒しの力', essence: '青い手を紋章に持つ人は、知識を実際の行動に変える力に長け、人を癒し支える手を持っています。' },
  { name: '黄色い星', english: 'Yellow Star', keyword: '美意識・調和', essence: '黄色い星を紋章に持つ人は、優れた美意識を持ち、物事を美しく調和のとれた形に整える才能があります。' },
  { name: '赤い月', english: 'Red Moon', keyword: '浄化・共感', essence: '赤い月を紋章に持つ人は、感情の機微に寄り添う共感力が高く、場や人間関係を浄化する働きをします。' },
  { name: '白い犬', english: 'White Dog', keyword: '忠誠・愛情', essence: '白い犬を紋章に持つ人は、深い愛情と忠誠心を持ち、家族や仲間との絆を何より大切にします。' },
  { name: '青い猿', english: 'Blue Monkey', keyword: '遊び心・創造性', essence: '青い猿を紋章に持つ人は、遊び心と自由な発想力にあふれ、場を和ませながら新しい発想を生み出します。' },
  { name: '黄色い人', english: 'Yellow Human', keyword: '自由意志・知性', essence: '黄色い人を紋章に持つ人は、自由な意志と冷静な知性を併せ持ち、自分自身の頭で考え選択する力があります。' },
  { name: '赤い空歩く人', english: 'Red Skywalker', keyword: '探検心・視野の広さ', essence: '赤い空歩く人を紋章に持つ人は、未知の領域へ踏み出す探検心を持ち、常に視野を広げようとします。' },
  { name: '白い魔法使い', english: 'White Wizard', keyword: '魅了する力・余裕', essence: '白い魔法使いを紋章に持つ人は、周囲を自然と魅了する不思議な魅力と、物事に動じない余裕を持っています。' },
  { name: '青い鷲', english: 'Blue Eagle', keyword: '俯瞰力・先見性', essence: '青い鷲を紋章に持つ人は、物事を高い視点から俯瞰し、先を見通す力に優れています。' },
  { name: '黄色い戦士', english: 'Yellow Warrior', keyword: '決断力・知性による行動', essence: '黄色い戦士を紋章に持つ人は、迷いを断ち切る決断力と、知性に裏打ちされた行動力を持っています。' },
  { name: '赤い地球', english: 'Red Earth', keyword: '調和・全体観', essence: '赤い地球を紋章に持つ人は、物事を大きな視点で捉え、周囲との調和を自然にとる才能があります。' },
  { name: '白い鏡', english: 'White Mirror', keyword: '洞察力・秩序', essence: '白い鏡を紋章に持つ人は、物事をありのままに映し出す洞察力を持ち、秩序立てて整理する力に長けています。' },
  { name: '青い嵐', english: 'Blue Storm', keyword: '変革・浄化のエネルギー', essence: '青い嵐を紋章に持つ人は、停滞した状況を大きく動かす変革のエネルギーと、自己変容への強さを持っています。' },
  { name: '黄色い太陽', english: 'Yellow Sun', keyword: '生命力・普遍性', essence: '黄色い太陽を紋章に持つ人は、周囲を明るく照らす太陽そのもののような存在感で、物事の本質を見抜きます。' }
]

// 13 galactic tones (音), from magnetic (1) to cosmic (13).
export const TONES: Tone[] = [
  { name: '磁気の音', english: 'Magnetic', keyword: '目的を定める力' },
  { name: '月の音', english: 'Lunar', keyword: '課題と向き合う力' },
  { name: '電気の音', english: 'Electric', keyword: '物事を活性化する力' },
  { name: '自己存在の音', english: 'Self-Existing', keyword: '形にしていく力' },
  { name: '倍音の音', english: 'Overtone', keyword: '影響力を放つ力' },
  { name: '律動の音', english: 'Rhythmic', keyword: 'バランスを整える力' },
  { name: '共振の音', english: 'Resonant', keyword: '周囲と同調する力' },
  { name: '銀河の音', english: 'Galactic', keyword: '調和させ統合する力' },
  { name: '太陽の音', english: 'Solar', keyword: '意図を実現する力' },
  { name: '惑星の音', english: 'Planetary', keyword: '現実に顕在化させる力' },
  { name: 'スペクトルの音', english: 'Spectral', keyword: '解き放つ力' },
  { name: '水晶の音', english: 'Crystal', keyword: '協力し合う力' },
  { name: '宇宙の音', english: 'Cosmic', keyword: '大いなる流れに委ねる力' }
]

const COLOR_CYCLE = ['red', 'white', 'blue', 'yellow'] as const
export type SealColor = (typeof COLOR_CYCLE)[number]

export function sealColor(sealIndex: number): SealColor {
  return COLOR_CYCLE[sealIndex % 4]
}
