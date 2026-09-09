// 画面に出ている画像がすべて読み込み終わるまで待つ。診断結果ページで、キャラクター全身像や
// 装飾フレームが後から順にパッと出てくるのを見せないために使う(pages/result.vue)。
//
// <img> だけでなく CSS の background-image も対象にしているのは、このサイトの装飾枠
// (.heroframe / .masthead__arch / .heroclose)がすべて background-image で、しかも
// ::before / ::after に指定されているものがあるため。見た目の重さのほとんどはこれらなので、
// <img> だけ待っても「まだ絵が出ていない」状態で覆いが外れてしまう。
//
// 走査は getComputedStyle をページ全体に一度だけ回す。数十msかかるが、待ちが確定してから
// 一度きりの実行なので、そのぶん画像の到着を待つ時間に埋もれる。

const CSS_URL = /url\((['"]?)([^'")]+)\1\)/g

// 読み込みに失敗した画像で止まらないよう、成否は問わず「決着したら次へ」進める。
function settle(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve()
  return new Promise<void>((resolve) => {
    img.addEventListener('load', () => resolve(), { once: true })
    img.addEventListener('error', () => resolve(), { once: true })
  })
}

function load(src: string): Promise<void> {
  return settle(Object.assign(new Image(), { src }))
}

function backgroundUrls(root: ParentNode): string[] {
  const urls = new Set<string>()
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
    for (const pseudo of [null, '::before', '::after']) {
      const value = getComputedStyle(el, pseudo).backgroundImage
      if (!value || value === 'none') continue
      for (const [, , url] of value.matchAll(CSS_URL)) {
        // data: は既に手元にあるので待つ必要がない。
        if (url && !url.startsWith('data:')) urls.add(url)
      }
    }
  }
  return [...urls]
}

/**
 * `root` 以下の <img> と background-image が読み込まれるまで待つ。
 *
 * 画像が1枚でも返ってこないと永久に待つことになるので、必ず `timeoutMs` で打ち切る。
 * 待ちきれなかった場合も解決する — 画像を待たせるより、画面を触れる方が優先。
 */
export function waitForImages(root: ParentNode = document, timeoutMs = 10000): Promise<void> {
  const images = Array.from(root.querySelectorAll('img')).map(settle)
  const backgrounds = backgroundUrls(root).map(load)
  return Promise.race([
    Promise.all([...images, ...backgrounds]).then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  ])
}
