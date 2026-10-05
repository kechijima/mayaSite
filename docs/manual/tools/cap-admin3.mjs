import { launch, ctx, go, shot, OUT, adminLogin, mark } from './lib.mjs'
const b = await launch(); const c = await ctx(b, 1280, 800, 1.5); const p = await c.newPage()
await adminLogin(p); await go(p, '/admin', 2500)
const links = p.locator('aside a'); const f = await links.first().boundingBox(), l = await links.last().boundingBox()
await p.evaluate(({ f, l }) => { const d = document.createElement('div'); d.id = '__nav'; d.style.cssText = `position:absolute;left:${f.x}px;top:${f.y}px;width:${f.width}px;height:${l.y + l.height - f.y}px`; document.body.appendChild(d) }, { f, l })
await shot(p, OUT + 'a02-dashboard.png', { fullPage: true, marks: [{ sel: '#__nav', n: 1, pad: 4 }, { loc: p.locator('aside button'), n: 2, pad: 8 }] })
await b.close()
