import { launch, ctx, go, shot, login, sleep, OUT, region, rshot, fillBirth, step, wants } from './lib.mjs'
const b = await launch()
const Q = '?name=' + encodeURIComponent('山田 花子') + '&birth=1990-04-15&gender=female'
const M = [390, 780]
const vshot = (p, name, marks) => shot(p, OUT + name + '.png', { marks })

if (wants('u0') || wants('u1')) { // 未ログイン
  const c = await ctx(b, ...M); const p = await c.newPage()
  await step('u01-top-form', async () => {
    await go(p, '/', 2500)
    const form = p.locator('form').first()
    await form.locator('input[type=text]').fill('山田 花子')
    await fillBirth(form, 1990, 4, 15)
    await rshot(p, 'u01-top-form', ['.siteheader', form.locator('button[type=submit]')], { padTop: 0, padBottom: 60, marks: [
      { loc: form.locator('input[type=text]'), n: 1 }, { loc: form.locator('.flex.gap-2').first(), n: 2 }, { loc: form.locator('.genderpick'), n: 3 }, { loc: form.locator('button[type=submit]'), n: 4 }] })
  })
  await step('u02-top-today', async () => {
    await rshot(p, 'u02-top-today', ['#today', '#compatibility'], { pad: 10 })
  })
  await step('u03-menu', async () => {
    await p.evaluate(() => window.scrollTo(0, 0)); await p.click('.siteheader__burger'); await sleep(700)
    await shot(p, OUT + 'u03-menu.png', { clip: { x: 0, y: 0, width: 390, height: 520 }, marks: [{ sel: '.siteheader__burger', n: 1 }] })
    await p.keyboard.press('Escape')
  })
  await step('u04-result-hero', async () => {
    await go(p, '/result' + Q, 3500)
    await rshot(p, 'u04-result-hero', ['.sharebar__btn'], { padTop: 420, padBottom: 130, marks: [{ sel: '.sharebar__btn', n: 1 }] })
  })
  await step('u05-result-sun', async () => {
    const sec = p.locator('#sun')
    const bb = await sec.boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u05-result-sun.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 90, width: 390, height: 760 } })
  })
  await step('u06-result-lock', async () => {
    const btn = p.locator('#sun').getByText('続きを購入する').first()
    await rshot(p, 'u06-result-lock', [btn], { padTop: 330, padBottom: 70, marks: [{ loc: btn, n: 1, pad: 8 }] })
  })
  await step('u07-result-tone', async () => {
    const bb = await p.locator('#tone').boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u07-result-tone.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 90, width: 390, height: 640 } })
  })
  await step('u08-result-relations', async () => {
    const btn = p.locator('#relations').getByText('詳しく見る').first()
    const bb = await p.locator('#relations').boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u08-result-relations.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 90, width: 390, height: 700 }, marks: [{ loc: btn, n: 1, pad: 6 }] })
  })
  await step('u09-result-destiny', async () => {
    const bb = await p.locator('#destiny').boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u09-result-destiny.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 90, width: 390, height: Math.min(760, bb.height + 100) } })
  })
  await step('u10-result-menu', async () => {
    await p.evaluate(() => window.scrollTo(0, 2400)); await sleep(800); await p.click('.siteheader__burger'); await sleep(700)
    await vshot(p, 'u10-result-menu', [{ sel: '.siteheader__burger', n: 1 }])
    await p.keyboard.press('Escape')
  })
  await step('u11-kin-seal', async () => {
    await p.locator('#relations').getByText('詳しく見る').first().click(); await sleep(3000)
    await p.evaluate(() => window.scrollTo(0, 0)); await vshot(p, 'u11-kin-seal')
    console.log('   url', p.url())
  })
  await step('u12-kin-detail', async () => {
    await go(p, '/result' + Q, 3500)
    await p.locator('#destiny a').nth(1).click(); await sleep(3000)
    await p.evaluate(() => window.scrollTo(0, 0)); await vshot(p, 'u12-kin-detail')
    console.log('   url', p.url())
  })
  await step('u13-compat-form', async () => {
    await go(p, '/compatibility', 2500)
    const names = p.locator('input[type=text]')
    await names.nth(0).fill('山田 花子'); await names.nth(1).fill('夫'); await names.nth(2).fill('母')
    const cards = p.locator('form .rounded-xl')
    await fillBirth(cards.nth(0), 1990, 4, 15); await fillBirth(cards.nth(1), 1988, 12, 1); await fillBirth(cards.nth(2), 1962, 6, 6)
    await cards.nth(1).locator('.genderpick__opt').nth(1).click()
    await rshot(p, 'u13-compat-form', ['h1', cards.nth(1)], { padTop: 30, padBottom: 20, marks: [{ loc: cards.nth(0), n: 1 }, { loc: cards.nth(1), n: 2 }] })
  })
  await step('u14-compat-submit', async () => {
    const btn = p.getByRole('button', { name: '相性を診断する' })
    await rshot(p, 'u14-compat-submit', [btn], { padTop: 330, padBottom: 40, marks: [{ loc: btn, n: 3, pad: 6 }] })
    await btn.click(); await sleep(3500)
  })
  await step('u15-compat-result', async () => {
    await p.evaluate(() => window.scrollTo(0, 0)); await shot(p, OUT + 'u15-compat-result-full.png', { fullPage: true })
  })
  await step('u16-signup', async () => {
    await go(p, '/signup', 2000)
    const f = p.locator('form')
    await f.locator('input[type=text]').fill('見本 太郎'); await fillBirth(f, 1991, 5, 20); await f.locator('.genderpick__opt').nth(1).click()
    await f.locator('input[type=tel]').fill('090-1234-5678'); await f.locator('input[type=email]').fill('taro@example.com')
    await f.locator('input[type=password]').nth(0).fill('password123'); await f.locator('input[type=password]').nth(1).fill('password123')
    await shot(p, OUT + 'u16-signup.png', { fullPage: true, marks: [{ loc: f.locator('.formgrid, .space-y-3, div').first(), n: null, pad: 0 }].slice(0, 0).concat([{ loc: f.locator('input[type=text]'), n: 1 }, { loc: f.locator('input[type=tel]'), n: 2 }, { loc: f.locator('input[type=email]'), n: 3 }, { loc: f.locator('input[type=password]').nth(0), n: 4 }, { loc: f.locator('button[type=submit]'), n: 5 }]) })
  })
  await step('u17-login', async () => {
    await go(p, '/login', 2000)
    await p.fill('input[type=email]', 'taro@example.com'); await p.fill('input[type=password]', 'password123')
    await shot(p, OUT + 'u17-login.png', { fullPage: true, clip: { x: 0, y: 110, width: 390, height: 460 }, marks: [{ sel: 'input[type=email]', n: 1 }, { sel: 'input[type=password]', n: 2 }, { sel: 'button[type=submit]', n: 3 }] })
  })
  await step('u18-plans', async () => {
    await go(p, '/result' + Q, 3000)
    await p.locator('#sun').getByText('続きを購入する').first().click(); await sleep(2500)
    await shot(p, OUT + 'u18-plans.png', { fullPage: true, marks: [{ loc: p.getByText('有料会員になる'), n: 1, pad: 6 }, { loc: p.getByText('この記事を購入する'), n: 2, pad: 6 }] })
    console.log('   url', p.url())
  })
  await c.close()
}

if (wants('u2')) { // 無料会員(伊藤 直樹)で購入の流れ
  const c = await ctx(b, ...M); const p = await c.newPage()
  await login(p, 'naoki@example.com')
  const QN = '?name=' + encodeURIComponent('伊藤 直樹') + '&birth=1995-12-25&gender=male'
  await step('u20-account-free', async () => {
    await go(p, '/account', 2500)
    await shot(p, OUT + 'u20-account-free.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 470 }, marks: [{ loc: p.getByText('プランを見る'), n: 1, pad: 6 }] })
  })
  await step('u21-account-edit', async () => {
    await p.getByText('編集する').click(); await sleep(600)
    const sec = p.locator('section, .panel').filter({ hasText: '登録情報' }).last()
    await rshot(p, 'u21-account-edit', [sec], { pad: 14, marks: [{ loc: p.getByRole('button', { name: '保存する' }), n: 1, pad: 6 }] })
    await p.getByRole('button', { name: 'やめる' }).click()
  })
  await step('u22-account-logout', async () => {
    const btn = p.getByRole('button', { name: 'ログアウト' })
    await rshot(p, 'u22-account-logout', [btn], { padTop: 60, padBottom: 70, marks: [{ loc: btn, n: 1, pad: 6 }] })
  })
  await step('u23-checkout', async () => {
    await go(p, '/result' + QN, 3000)
    await p.locator('#sun').getByText('続きを購入する').first().click(); await sleep(2500)
    await p.getByText('有料会員になる').click(); await sleep(2500)
    await shot(p, OUT + 'u23-checkout.png', { fullPage: true, clip: { x: 0, y: 110, width: 390, height: 560 }, marks: [{ loc: p.getByText('お支払いへ進む'), n: 1, pad: 6 }] })
  })
  await step('u24-pay', async () => {
    await p.getByText('お支払いへ進む').click(); await sleep(2500)
    const pay = p.getByRole('button', { name: /を支払う/ })
    await shot(p, OUT + 'u24-pay.png', { fullPage: true, clip: { x: 0, y: 80, width: 390, height: 680 }, marks: [{ loc: pay, n: 1, pad: 6 }] })
    await pay.click(); await sleep(3500)
  })
  await step('u25-success', async () => {
    await shot(p, OUT + 'u25-success.png', { fullPage: true })
    console.log('   url', p.url())
  })
  await step('u26-result-unlocked', async () => {
    await go(p, '/result' + QN, 3500)
    const h = p.locator('#sun').getByText('注意すべき傾向').last()
    const bb = await h.boundingBox(); const sy = await p.evaluate(() => scrollY)
    await shot(p, OUT + 'u26-result-unlocked.png', { fullPage: true, clip: { x: 0, y: bb.y + sy - 30, width: 390, height: 620 } })
  })
  await step('u27-account-paid', async () => {
    await go(p, '/account', 2500)
    await shot(p, OUT + 'u27-account-paid.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 430 }, marks: [{ loc: p.getByRole('button', { name: /解約する/ }), n: 1, pad: 6 }] })
  })
  await c.close()
}

if (wants('u3')) { // 単体購入済み(高橋 由美)
  const c = await ctx(b, ...M); const p = await c.newPage()
  await login(p, 'yumi@example.com')
  await step('u30-account-purchased', async () => {
    await go(p, '/account', 2500)
    await shot(p, OUT + 'u30-account-purchased.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 520 } })
  })
  await c.close()
}

if (wants('u4')) { // チーム会員(中村 愛)で到達度診断テスト
  const c = await ctx(b, ...M); const p = await c.newPage()
  await login(p, 'ai@example.com')
  const mask = () => p.evaluate(() => document.querySelectorAll('.survey__q').forEach((q) => { const n = q.querySelector('.survey__num'); q.textContent = ''; q.appendChild(n); q.appendChild(document.createTextNode('（ここに設問の文章が表示されます）')) }))
  await step('u40-menu-test', async () => {
    await go(p, '/', 2500); await p.click('.siteheader__burger'); await sleep(700)
    await shot(p, OUT + 'u40-menu-test.png', { clip: { x: 0, y: 0, width: 390, height: 560 }, marks: [{ loc: p.locator('.sitemenu').getByText('到達度診断テスト'), n: 1, pad: 6 }, { sel: '.sitemenu__user', n: 2, pad: 6 }] })
    await p.keyboard.press('Escape')
  })
  await step('u41-account-test', async () => {
    await go(p, '/account', 2500)
    const btn = p.getByText('到達度診断テストを受ける')
    await rshot(p, 'u41-account-test', [btn], { padTop: 130, padBottom: 40, marks: [{ loc: btn, n: 1, pad: 6 }] })
  })
  await step('u42-test-first', async () => {
    await go(p, '/test', 2500)
    await shot(p, OUT + 'u42-test-first.png', { fullPage: true })
  })
  await step('u43-test-take', async () => {
    await go(p, '/test/take', 3000); await mask()
    const items = p.locator('.survey__item')
    await items.nth(0).locator('.survey__choice').nth(0).click(); await items.nth(1).locator('.survey__choice').nth(2).click()
    await rshot(p, 'u43-test-take', ['.siteheader', items.nth(2)], { padTop: 0, padBottom: 14, marks: [{ loc: items.nth(0).locator('.survey__choices'), n: 1, pad: 5 }] })
  })
  await step('u44-test-missing', async () => {
    const items = p.locator('.survey__item'); const n = await items.count()
    for (let i = 2; i < n; i++) { if (i === 22) continue; await items.nth(i).locator('.survey__choice').nth(i % 7 === 3 ? 1 : (i % 3 === 0 ? 2 : 0)).click() }
    await p.getByRole('button', { name: '結果を見る' }).click(); await sleep(1200); await mask()
    const btn = p.getByRole('button', { name: '結果を見る' })
    await rshot(p, 'u44-test-missing', [items.nth(22), btn], { padTop: 14, padBottom: 30 })
    await items.nth(22).locator('.survey__choice').nth(0).click()
    await rshot(p, 'u45-test-submit', [items.nth(24), btn], { padTop: 10, padBottom: 30, marks: [{ loc: btn, n: 1, pad: 6 }] })
    await btn.click(); await sleep(3000)
  })
  await step('u46-test-result', async () => {
    await p.evaluate(() => window.scrollTo(0, 0)); await shot(p, OUT + 'u46-test-result.png', { fullPage: true })
  })
  await step('u47-test-index', async () => {
    await c.clearCookies()
    const c2 = await ctx(b, ...M); const p2 = await c2.newPage(); await login(p2, 'hanako@example.com')
    await go(p2, '/test', 2500); await shot(p2, OUT + 'u47-test-index.png', { fullPage: true, marks: [{ loc: p2.getByText('もう一度受ける'), n: 1, pad: 6 }] })
    await c2.close()
  })
  await c.close()
}

if (wants('u5')) { // 無料会員(小林 誠)のテスト案内 / PC表示
  const c = await ctx(b, ...M); const p = await c.newPage(); await login(p, 'makoto@example.com')
  await step('u50-test-free', async () => { await go(p, '/test', 2500); await shot(p, OUT + 'u50-test-free.png', { fullPage: true, clip: { x: 0, y: 0, width: 390, height: 580 } }) })
  await c.close()
  const c2 = await ctx(b, 1280, 800, 1.5); const p2 = await c2.newPage(); await login(p2, 'hanako@example.com')
  await step('u51-pc-top', async () => { await go(p2, '/', 3000); await shot(p2, OUT + 'u51-pc-top.png', { marks: [{ sel: '.siteheader__nav', n: 1, pad: 6 }] }) })
  await c2.close()
}
await b.close()
