import { launch, ctx, go, shot, login, sleep, OUT, rshot, fillBirth, step } from './lib.mjs'
const b = await launch(); const M = [390, 780]
{
  const c = await ctx(b, ...M); const p = await c.newPage()
  await step('t01-signup-ref', async () => {
    await go(p, '/signup/referral', 2500)
    const f = p.locator('form')
    await f.locator('input[type=text]').first().fill('見本 花'); await fillBirth(f, 1993, 8, 17)
    await f.locator('input[type=tel]').fill('090-1234-5678'); await f.locator('input[type=email]').fill('hana@example.com')
    await f.locator('input[type=password]').nth(0).fill('password123'); await f.locator('input[type=password]').nth(1).fill('password123')
    await p.selectOption('#referral-team', { label: '京都マヤ暦研究会' }); await p.fill('#referral-code', 'KYT7M3QP9'); await p.locator('#referral-code').blur(); await sleep(1500)
    await rshot(p, 't01-signup-ref-a', ['h1', f.locator('input[type=password]').nth(1)], { padTop: 40, padBottom: 14, marks: [{ loc: f.locator('input[type=text]').first(), n: 1 }, { loc: f.locator('input[type=password]').nth(0), n: 2 }] })
    const btn = f.locator('button[type=submit]')
    await rshot(p, 't01-signup-ref-b', ['#referral-team', btn], { padTop: 40, padBottom: 30, marks: [{ sel: '#referral-team', n: 3 }, { sel: '#referral-code', n: 4 }, { loc: btn, n: 5, pad: 6 }] })
  })
  await step('t02-code-error', async () => {
    await p.fill('#referral-code', 'ABCDEFGH2'); await p.locator('#referral-code').blur(); await sleep(1500)
    await rshot(p, 't02-code-error', ['#referral-team', '#referral-code'], { padTop: 36, padBottom: 50 })
    await p.fill('#referral-code', 'KYT7M3QP9'); await p.locator('#referral-code').blur(); await sleep(1500)
    await p.locator('form button[type=submit]').click(); await sleep(4000)
    console.log('   url', p.url())
  })
  await step('t03-account-team', async () => {
    await go(p, '/account', 2500)
    await shot(p, OUT + 't03-account-team.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 330 }, marks: [{ loc: p.getByText('チーム会員', { exact: true }), n: null, pad: 6 }] })
  })
  await c.close()
}
{
  const c = await ctx(b, ...M); const p = await c.newPage(); await login(p, 'makoto@example.com')
  await step('t04-account-code', async () => {
    await go(p, '/account', 2500)
    await p.selectOption('#referral-team', { label: '奈良サロン' }); await p.fill('#referral-code', 'NRA4R8WXH'); await p.locator('#referral-code').blur(); await sleep(1500)
    const btn = p.getByRole('button', { name: '登録する' })
    await rshot(p, 't04-account-code', ['#referral-team', btn], { padTop: 130, padBottom: 30, marks: [{ sel: '#referral-team', n: 1 }, { sel: '#referral-code', n: 2 }, { loc: btn, n: 3, pad: 6 }] })
  })
  await step('t05-name-link', async () => {
    await go(p, '/', 2500); await p.click('.siteheader__burger'); await sleep(800)
    await shot(p, OUT + 't05-name-link.png', { clip: { x: 0, y: 0, width: 390, height: 420 }, marks: [{ sel: '.sitemenu__user', n: 1, pad: 6 }] })
  })
  await c.close()
}
// 撮り直し
{
  const c = await ctx(b, ...M); const p = await c.newPage()
  const Q = '?name=' + encodeURIComponent('山田 花子') + '&birth=1990-04-15&gender=female'
  await step('u04-result-hero', async () => { await go(p, '/result' + Q, 3500); await rshot(p, 'u04-result-hero', ['.sharebar__btn'], { padTop: 540, padBottom: 130, marks: [{ sel: '.sharebar__btn', n: 1 }] }) })
  await step('u15-compat', async () => {
    await go(p, '/compatibility', 2500)
    const names = p.locator('input[type=text]'); await names.nth(0).fill('山田 花子'); await names.nth(1).fill('夫'); await names.nth(2).fill('母')
    const cards = p.locator('form .rounded-xl'); await fillBirth(cards.nth(0), 1990, 4, 15); await fillBirth(cards.nth(1), 1988, 12, 1); await fillBirth(cards.nth(2), 1962, 6, 6)
    await cards.nth(1).locator('.genderpick__opt').nth(1).click(); await p.getByRole('button', { name: '相性を診断する' }).click(); await sleep(3500)
    await shot(p, OUT + 'u15-compat-people.png', { fullPage: true, clip: { x: 0, y: 200, width: 390, height: 530 } })
    const h = p.getByText('夫さんから見た母さん'); const bb = await h.boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u15-compat-pair.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 290, width: 390, height: 560 } })
    const g = p.getByText('関係の説明'); const gb = await g.boundingBox()
    await shot(p, OUT + 'u15-compat-guide.png', { fullPage: true, clip: { x: 0, y: gb.y + sy - 60, width: 390, height: 330 }, marks: [{ loc: p.getByText('もう一度診断する'), n: 1, pad: 6 }] })
  })
  await c.close()
  const c2 = await ctx(b, ...M); const p2 = await c2.newPage(); await login(p2, 'naoki@example.com')
  await step('u26', async () => {
    await go(p2, '/result?name=' + encodeURIComponent('伊藤 直樹') + '&birth=1995-12-25&gender=male', 3500)
    const h = p2.locator('#sun').getByText('注意すべき傾向').last(); const bb = await h.boundingBox(); const sy = await p2.evaluate(() => scrollY)
    await shot(p2, OUT + 'u26-result-unlocked.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 20, width: 390, height: 250 } })
  })
  await c2.close()
  const c3 = await ctx(b, ...M); const p3 = await c3.newPage(); await login(p3, 'sho@example.com')
  await step('u50', async () => { await go(p3, '/test', 2500); await shot(p3, OUT + 'u50-test-free.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 640 } }) })
  await c3.close()
}
await b.close()
