import { launch, ctx, go, shot, sleep, OUT, rshot, step, adminLogin, region } from './lib.mjs'
const b = await launch()
const c = await ctx(b, 1280, 800, 1.5); const p = await c.newPage()
const v = (name, marks, clip) => shot(p, OUT + name + '.png', { marks, clip })
const main = 'main'
await step('a01-login', async () => {
  await go(p, '/admin/login', 2000)
  await p.fill('input[type=email]', 'admin@example.com'); await p.fill('input[type=password]', 'password123')
  await v('a01-login', [{ sel: 'input[type=email]', n: 1 }, { sel: 'input[type=password]', n: 2 }, { sel: 'button[type=submit]', n: 3 }], { x: 290, y: 100, width: 700, height: 560 })
  await p.click('button[type=submit]'); await sleep(3500)
})
await step('a02-dashboard', async () => {
  await go(p, '/admin', 2500)
  await v('a02-dashboard', [{ sel: 'aside nav', n: 1, pad: 4 }, { loc: p.locator('aside').getByText('ログアウト'), n: 2, pad: 8 }])
})
await step('a03-content', async () => {
  await go(p, '/admin/content', 3000)
  const search = p.locator('main input').first()
  await v('a03-content', [{ loc: search, n: 1 }, { loc: p.locator('main button[aria-label]').first(), n: 2, side: 'right' }, { loc: p.locator('tbody tr').nth(6), n: 3, pad: 0 }])
})
await step('a04-content-filter', async () => {
  await p.locator('main button[aria-label]').first().click(); await sleep(700)
  await v('a04-content-filter')
  await p.getByRole('button', { name: '閉じる' }).click().catch(() => p.keyboard.press('Escape')); await sleep(400)
})
await step('a05-content-search', async () => {
  await p.locator('main input').first().fill('247'); await sleep(900)
  await v('a05-content-search', [{ loc: p.locator('main input').first(), n: 1 }], { x: 0, y: 0, width: 1280, height: 330 })
})
await step('a06-char', async () => {
  await go(p, '/admin/content/character-6', 3500)
  await v('a06-char-top', [{ loc: p.getByText('総合解説（無料エリア本文）').locator('xpath=..'), n: null, pad: 4 }], { x: 0, y: 0, width: 1280, height: 520 })
  const add = p.getByText('+ 項目を追加').first(), h = p.getByText('あなたはこんな人', { exact: true })
  const row = p.locator('input[value]').filter({ hasNot: p.locator('x') })
  const clip = await region(p, [h, add], { pad: 14 }); clip.x = 190; clip.width = 620
  const first = h.locator('xpath=following::input[1]')
  await shot(p, OUT + 'a07-char-list.png', { fullPage: true, clip, marks: [{ loc: first, n: 1 }, { loc: first.locator('xpath=following::button[1]'), n: 2, pad: 3 }, { loc: first.locator('xpath=following::button[3]'), n: 3, pad: 3, side: 'right' }, { loc: add, n: 4, pad: 4 }] })
  const ph = p.getByText('紋章プロフィール項目（有料プランに表示）')
  const pb = await ph.boundingBox(); const sy = await p.evaluate(() => scrollY)
  await shot(p, OUT + 'a08-char-premium.png', { fullPage: true, clip: { x: 190, y: pb.y + sy - 16, width: 1090, height: 250 }, marks: [{ loc: ph.locator('xpath=..'), n: null, pad: 4 }] })
  const save = p.getByRole('button', { name: '保存する' })
  const pub = p.getByText('公開', { exact: true }).locator('xpath=..')
  const clip2 = await region(p, [save], { pad: 26 }); clip2.x = 190; clip2.width = 1090
  await shot(p, OUT + 'a09-char-save.png', { fullPage: true, clip: clip2, marks: [{ loc: p.locator('input[type=radio]').first().locator('xpath=../..'), n: 1, pad: 6 }, { loc: save, n: 2, pad: 5 }] })
})
await step('a10-kin', async () => {
  await go(p, '/admin/content/kin-247', 3500)
  await v('a10-kin', [{ loc: p.locator('textarea').first(), n: 1 }, { loc: p.locator('textarea').nth(2), n: 2 }], { x: 0, y: 0, width: 1280, height: 780 })
})
await step('a12-tests', async () => { await go(p, '/admin/tests', 3000); await v('a12-tests', [{ loc: p.locator('tbody tr').nth(6), n: 1, pad: 0 }], { x: 0, y: 0, width: 1280, height: 520 }) })
await step('a13-tests-edit', async () => {
  await go(p, '/admin/tests/6', 3500)
  const ta = p.locator('textarea')
  await v('a13-tests-edit', [{ loc: ta.nth(0), n: 1 }, { loc: ta.nth(1), n: 2 }, { loc: p.getByText('点数配分').first().locator('xpath=../..'), n: 3, side: 'right' }], { x: 0, y: 0, width: 1280, height: 620 })
  const save = p.getByRole('button', { name: '保存する' }); const clip = await region(p, [save], { pad: 30 }); clip.x = 190; clip.width = 1090
  await shot(p, OUT + 'a14-tests-save.png', { fullPage: true, clip, marks: [{ loc: save, n: 1, pad: 5 }] })
})
await step('a15-teams', async () => {
  await go(p, '/admin/teams', 3000)
  await p.locator('main input').first().fill('大阪クラス')
  await v('a15-teams', [{ loc: p.locator('main input').first(), n: 1 }, { loc: p.getByRole('button', { name: '作成する' }), n: 2, side: 'right' }], { x: 0, y: 0, width: 1280, height: 480 })
  await p.getByRole('button', { name: '作成する' }).click(); await sleep(3000)
  console.log('   url', p.url())
  await v('a16-teams-created', undefined, { x: 0, y: 0, width: 1280, height: 560 })
})
await step('a17-team', async () => {
  await go(p, '/admin/teams/KYT', 3500)
  const codeCard = p.getByText('紹介コード', { exact: true }).locator('xpath=..')
  const clip = await region(p, ['h1', codeCard], { pad: 20 }); clip.x = 190; clip.width = 1090
  await shot(p, OUT + 'a17-team-code.png', { fullPage: true, clip, marks: [{ loc: codeCard.locator('button').first(), n: 1, pad: 4 }, { loc: p.getByRole('button', { name: '無効にする' }), n: 2, pad: 4, side: 'right' }] })
  const info = p.getByText('チーム情報', { exact: true }).locator('xpath=..')
  const clip2 = await region(p, [info], { pad: 14 }); clip2.x = 190; clip2.width = 1090
  await shot(p, OUT + 'a18-team-info.png', { fullPage: true, clip: clip2, marks: [{ loc: info.locator('input').nth(0), n: 1 }, { loc: info.locator('input').nth(1), n: 2 }, { loc: info.getByRole('button', { name: '保存する' }), n: 3, pad: 4 }] })
  const em = p.locator('input[type=email]'); await em.fill('sho@example.com'); await p.getByRole('button', { name: '検索' }).click(); await sleep(1500)
  const mem = p.getByText(/^メンバー/).locator('xpath=..')
  const clip3 = await region(p, [mem], { pad: 14 }); clip3.x = 190; clip3.width = 1090
  await shot(p, OUT + 'a19-team-add.png', { fullPage: true, clip: clip3, marks: [{ loc: em, n: 1 }, { loc: p.getByRole('button', { name: '検索' }), n: 2, pad: 4, side: 'right' }, { loc: p.getByRole('button', { name: 'このチームに追加' }), n: 3, pad: 4, side: 'right' }, { loc: p.locator('tbody tr').first().getByText('外す'), n: 4, pad: 6, side: 'right' }] })
  await p.locator('tbody tr').first().getByText('外す').click(); await sleep(700)
  await v('a20-team-remove')
  await p.getByRole('button', { name: 'やめる' }).click()
})
await step('a21-users', async () => {
  await go(p, '/admin/users', 3000)
  await v('a21-users', [{ loc: p.locator('main input').first(), n: 1 }, { loc: p.locator('main button[aria-label]').first(), n: 2, side: 'right' }, { loc: p.locator('tbody tr').filter({ hasText: '加藤 翔' }), n: 3, pad: 0 }], { x: 0, y: 0, width: 1280, height: 640 })
  await p.locator('main button[aria-label]').first().click(); await sleep(700)
  await v('a22-users-filter'); await p.getByRole('button', { name: '閉じる' }).click().catch(() => p.keyboard.press('Escape')); await sleep(400)
})
await step('a23-user-detail', async () => {
  await p.locator('tbody tr').filter({ hasText: '加藤 翔' }).click(); await sleep(3000)
  console.log('   url', p.url())
  const lab = p.locator('label').filter({ hasText: '利用停止' }); await lab.click(); await sleep(300)
  await shot(p, OUT + 'a23-user-detail.png', { fullPage: true, marks: [{ loc: lab.locator('xpath=..'), n: 1, pad: 5 }, { loc: p.getByRole('button', { name: '変更を適用' }), n: 2, pad: 5 }] })
})
await step('a24-user-tests', async () => {
  await go(p, '/admin/users', 3000); await p.locator('tbody tr').filter({ hasText: '山田 花子' }).click(); await sleep(3500)
  await shot(p, OUT + 'a24-user-tests-closed.png', { fullPage: true })
})
await step('a25-history', async () => {
  await go(p, '/admin/history', 3000); await v('a25-history', [{ loc: p.locator('tbody tr').nth(1), n: 1, pad: 0 }, { loc: p.getByRole('button', { name: /次へ/ }), n: 2, pad: 4, side: 'right' }], { x: 0, y: 0, width: 1280, height: 700 })
  await p.locator('tbody tr').nth(1).click(); await sleep(3000)
  await shot(p, OUT + 'a26-history-detail.png', { fullPage: true })
})
await step('a27-test-history', async () => { await go(p, '/admin/test-history', 3500); await v('a27-test-history', [{ loc: p.locator('tbody tr').nth(0), n: 1, pad: 0 }], { x: 0, y: 0, width: 1280, height: 420 }) })
await c.close()
{
  const c2 = await ctx(b, 390, 780); const p2 = await c2.newPage()
  await step('a30-mobile', async () => {
    await go(p2, '/admin/login', 2000); await p2.fill('input[type=email]', 'admin@example.com'); await p2.fill('input[type=password]', 'password123'); await p2.click('button[type=submit]'); await sleep(3500)
    await go(p2, '/admin/users', 3000)
    const burger = p2.locator('header button, button[aria-label*="メニュー"]').first()
    await shot(p2, OUT + 'a30-mobile-users.png', { marks: [{ loc: burger, n: 1, pad: 4 }] })
    await burger.click(); await sleep(800); await shot(p2, OUT + 'a31-mobile-menu.png')
  })
  await c2.close()
}
await b.close()
