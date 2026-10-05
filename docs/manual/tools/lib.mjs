// 操作マニュアル用スクリーンショットの撮影道具(2026-10-05 に使ったものの控え)。
// 手順: エミュレータ(firestore,auth)と nuxt dev を起動 → seed 5本 → dummy.ts でダミーの会員・チームを入れる
//       → admin:create:emulator で admin@example.com を作る → cap-user / cap-team / cap-admin / cap-admin2 / cap-admin3 の順に実行。
// 画面の文言やレイアウトが変わると要素の指定がずれるので、撮り直すときは出力を目で確認すること。
import { chromium } from 'playwright'
export const BASE = 'http://localhost:3000'
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
export async function launch() { return chromium.launch() }
export async function ctx(browser, width, height, dpr = 2) {
  const c = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, locale: 'ja-JP', timezoneId: 'Asia/Tokyo', isMobile: width < 600, hasTouch: width < 600 })
  await c.addInitScript(() => {
    const add = () => { const s = document.createElement('style'); s.textContent = '.firebase-emulator-warning{display:none!important} #nuxt-devtools-container, nuxt-devtools-frame{display:none!important}'; document.documentElement.appendChild(s) }
    if (document.documentElement) add(); else document.addEventListener('DOMContentLoaded', add)
  })
  return c
}
export async function go(page, path, wait = 1800) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('h1, main, form', { timeout: 30000 }).catch(() => {})
  await sleep(wait)
}
export async function settle(page, ms = 1200) { await sleep(ms) }
// marks: [{ sel | loc, n, pad }] — 赤枠と番号バッジを重ねる
export async function mark(page, marks) {
  for (const m of marks) {
    const loc = m.loc ?? page.locator(m.sel).first()
    const box = await loc.boundingBox()
    if (!box) { console.warn('mark not found', m.sel ?? m.n); continue }
    await page.evaluate(({ box, n, pad, side }) => {
      const sx = window.scrollX, sy = window.scrollY
      const d = document.createElement('div')
      d.className = '__mk'
      d.style.cssText = `position:absolute;z-index:2147483646;pointer-events:none;box-sizing:border-box;left:${box.x + sx - pad}px;top:${box.y + sy - pad}px;width:${box.width + pad * 2}px;height:${box.height + pad * 2}px;border:3px solid #e11d48;border-radius:8px;box-shadow:0 0 0 2px rgba(255,255,255,.85)`
      if (n != null) {
        const b = document.createElement('div')
        const pos = side === 'right' ? 'right:-14px;top:-14px' : side === 'inside' ? 'left:4px;top:4px' : 'left:-14px;top:-14px'
        b.style.cssText = `position:absolute;${pos};width:26px;height:26px;border-radius:50%;background:#e11d48;color:#fff;font:700 15px/26px -apple-system,"Hiragino Sans",sans-serif;text-align:center;box-shadow:0 0 0 2px #fff`
        b.textContent = String(n)
        d.appendChild(b)
      }
      document.body.appendChild(d)
    }, { box, n: m.n ?? null, pad: m.pad ?? 4, side: m.side ?? 'left' })
  }
}
export async function unmark(page) { await page.evaluate(() => document.querySelectorAll('.__mk').forEach((e) => e.remove())) }
export async function shot(page, file, opts = {}) {
  if (opts.marks) await mark(page, opts.marks)
  const o = { path: file, fullPage: !!opts.fullPage, animations: 'disabled' }
  if (opts.clip) o.clip = opts.clip
  if (opts.el) await page.locator(opts.el).first().screenshot({ path: file, animations: 'disabled' })
  else await page.screenshot(o)
  if (opts.marks) await unmark(page)
}
export async function login(page, email, redirect = '/') {
  await go(page, '/login')
  await page.fill('input[type=email]', email)
  await page.fill('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await sleep(2500)
}
export async function adminLogin(page) {
  await go(page, '/admin/login')
  await page.fill('input[type=email]', 'admin@example.com')
  await page.fill('input[type=password]', 'password123')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/admin(\/)?$/, { timeout: 20000 }).catch(() => {})
  await sleep(2000)
}
export const OUT = new URL('../img/', import.meta.url).pathname
// ページ座標での切り出し範囲。locs の外接矩形を横いっぱい(または指定幅)で返す
export async function region(page, locs, { pad = 16, fullWidth = true, padTop, padBottom } = {}) {
  let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity
  const sy = await page.evaluate(() => window.scrollY), sx = await page.evaluate(() => window.scrollX)
  for (const l of locs) {
    const loc = typeof l === 'string' ? page.locator(l).first() : l
    const b = await loc.boundingBox(); if (!b) { console.warn('region: not found', l); continue }
    top = Math.min(top, b.y + sy); bottom = Math.max(bottom, b.y + sy + b.height); left = Math.min(left, b.x + sx); right = Math.max(right, b.x + sx + b.width)
  }
  const vw = page.viewportSize().width
  const dh = await page.evaluate(() => document.documentElement.scrollHeight)
  const y = Math.max(0, top - (padTop ?? pad)), y2 = Math.min(dh, bottom + (padBottom ?? pad))
  const x = fullWidth ? 0 : Math.max(0, left - pad), x2 = fullWidth ? vw : Math.min(vw, right + pad)
  return { x, y, width: x2 - x, height: y2 - y }
}
export async function rshot(page, name, locs, opts = {}) {
  const clip = await region(page, locs, opts)
  await shot(page, OUT + name + '.png', { fullPage: true, clip, marks: opts.marks })
}
export async function fillBirth(scope, y, m, d) {
  const s = scope.locator('select')
  await s.nth(0).selectOption(String(y)); await s.nth(1).selectOption(String(m)); await s.nth(2).selectOption(String(d))
}
const only = process.argv.slice(2)
export async function step(name, fn) {
  if (only.length && !only.some((o) => name.startsWith(o))) return
  try { await fn(); console.log('ok  ', name) } catch (e) { console.log('FAIL', name, String(e.message).split('\n')[0]) }
}
export const wants = (prefix) => !only.length || only.some((o) => o.startsWith(prefix) || prefix.startsWith(o))
