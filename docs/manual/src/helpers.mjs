// マニュアル本文を組み立てるための小さな部品。content-*.mjs から使う。
// サイトのアドレス。独自ドメインに変わったらここだけ直す。
export const SITE_URL = 'https://mayachannel-34fd5.web.app'
// PDF 上で押すとそのまま開けるリンクにする
export const url = (path = '') => `<a class="url" href="${SITE_URL}${path}">${SITE_URL}${path}</a>`
export const ui = (s) => `<span class="ui">${s}</span>`
export const n = (i) => `<span class="n">${i}</span>`
const fig = (img, cap) => `<figure class="shot"><img src="../img/${img}.png" alt="">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`
// スマホ画面(左)+説明(右)
export const block = (img, html, cap) => `<div class="block">${fig(img, cap)}<div>${html}</div></div>`
// 横長の画面(上)+説明(下)
export const wide = (img, html = '', cap) => `<div class="block block--wide">${fig(img, cap)}<div>${html}</div></div>`
export const pair = (a, b, capA, capB) => `<div class="pair">${fig(a, capA)}${fig(b, capB)}</div>`
export const steps = (items) => `<ol class="steps">${items.map((i) => `<li>${i}</li>`).join('')}</ol>`
export const list = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
export const note = (html, title = 'ポイント') => `<div class="note"><b>${title}</b>${html}</div>`
export const warn = (html, title = 'ご注意') => `<div class="warn"><b>${title}</b>${html}</div>`
export const table = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="nw"' : ''}>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`
export const qa = (pairs) => pairs.map(([q, a]) => `<dl class="qa"><dt>${q}</dt><dd>${a}</dd></dl>`).join('')
