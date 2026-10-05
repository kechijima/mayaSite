import { launch, ctx, go, shot, OUT } from './lib.mjs'
const b = await launch(); const c = await ctx(b, 390, 780); const p = await c.newPage()
await go(p, '/result?name=' + encodeURIComponent('山田 花子') + '&birth=1990-04-15&gender=female', 6000)
const bb = await p.locator('#relations').boundingBox(); const sy = await p.evaluate(() => scrollY)
await shot(p, OUT + 'u08-result-relations.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 90, width: 390, height: 740 }, marks: [{ loc: p.locator('#relations .relcard').first(), n: 1, pad: 5 }] })
await b.close()
