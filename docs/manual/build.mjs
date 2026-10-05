// 操作マニュアルの PDF を作る: node docs/manual/build.mjs
// src/content-*.mjs(本文)+ img/(スクリーンショット)→ html/*.html → *.pdf
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import user from './src/content-user.mjs'
import team from './src/content-team.mjs'
import admin from './src/content-admin.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, 'manual.css'), 'utf8')
const EDITION = '2026年10月版'

function render(doc) {
  const toc = doc.chapters
    .map((c, i) => `<li><span class="no">${i + 1}</span><a href="#ch${i + 1}">${c.title}</a><small>${c.summary}</small></li>`)
    .join('')
  const body = doc.chapters
    .map((c, i) => `<section class="chapter" id="ch${i + 1}"><h2><span>${i + 1}</span>${c.title}</h2>${c.html}</section>`)
    .join('')
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${doc.site} ${doc.title}</title>
<style>:root{--accent:${doc.accent}}${css}</style></head><body>
<div class="cover"><div class="cover__site">${doc.site}</div><h1 class="cover__title">${doc.title}</h1><div class="cover__sub">${doc.sub}</div>
<div class="cover__meta">${EDITION}<br>画面の見本は説明用のもので、表示されているお名前などはすべて架空です。</div></div>
<nav class="toc"><h2>もくじ</h2><ol>${toc}</ol></nav>
${body}</body></html>`
}

mkdirSync(join(here, 'html'), { recursive: true })
const browser = await chromium.launch()
for (const doc of [user, team, admin]) {
  const htmlPath = join(here, 'html', `${doc.file}.html`)
  writeFileSync(htmlPath, render(doc))
  const page = await browser.newPage()
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' })
  await page.pdf({
    path: join(here, `${doc.file}.pdf`),
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: `<div style="width:100%;font-size:8px;color:#888;padding:0 15mm;display:flex;justify-content:space-between;font-family:'Hiragino Sans',sans-serif"><span>${doc.site} ${doc.title}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`
  })
  await page.close()
  console.log('built', `${doc.file}.pdf`)
}
await browser.close()
