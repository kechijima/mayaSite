import { launch, ctx, go, shot, sleep, OUT, step, adminLogin, region } from './lib.mjs'
const b = await launch(); const c = await ctx(b, 1280, 800, 1.5); const p = await c.newPage()
await adminLogin(p)
await step('a02', async () => {
  await go(p, '/admin', 2500)
  await shot(p, OUT + 'a02-dashboard.png', { marks: [{ sel: 'aside nav', n: 1, pad: 4 }, { loc: p.locator('aside').getByText('ログアウト', { exact: false }).last(), n: 2, pad: 8 }] })
})
await step('a06', async () => {
  await go(p, '/admin/content/character-6', 3500)
  const add = p.getByText('+ 項目を追加').first(), h = p.getByText('あなたはこんな人', { exact: true })
  const clip = await region(p, [h, add], { pad: 14 }); clip.x = 200; clip.width = 548
  const first = h.locator('xpath=following::input[1]')
  await shot(p, OUT + 'a07-char-list.png', { fullPage: true, clip, marks: [{ loc: first, n: 1 }, { loc: first.locator('xpath=following::button[1]'), n: 2, pad: 3 }, { loc: first.locator('xpath=following::button[3]'), n: 3, pad: 3, side: 'right' }, { loc: add, n: 4, pad: 4 }] })
  const ph = p.getByText('紋章プロフィール項目（有料プランに表示）'); const pb = await ph.boundingBox(); const sy = await p.evaluate(() => scrollY)
  await shot(p, OUT + 'a08-char-premium.png', { fullPage: true, clip: { x: 200, y: pb.y + sy - 16, width: 1080, height: 250 } })
})
await step('a13', async () => {
  await go(p, '/admin/tests/6', 3500); const ta = p.locator('textarea')
  await shot(p, OUT + 'a13-tests-edit.png', { clip: { x: 0, y: 0, width: 1280, height: 620 }, marks: [{ loc: ta.nth(0), n: 1 }, { loc: ta.nth(1), n: 2 }, { loc: p.locator('button', { hasText: 'そう思う' }).first().locator('xpath=..'), n: 3, side: 'right', pad: 6 }] })
})
await step('a19', async () => {
  await go(p, '/admin/teams/KYT', 3500)
  const em = p.locator('input[type=email]'); await em.fill('sho@example.com'); await p.getByRole('button', { name: '検索' }).click(); await sleep(1500)
  const clip = await region(p, [p.getByText(/^メンバー（/), p.locator('tbody tr').last()], { pad: 22 }); clip.x = 200; clip.width = 1080
  const row = p.locator('tbody tr').filter({ hasText: '中村 愛' })
  await shot(p, OUT + 'a19-team-add.png', { fullPage: true, clip, marks: [{ loc: em, n: 1 }, { loc: p.getByRole('button', { name: '検索' }), n: 2, pad: 4, side: 'right' }, { loc: p.getByRole('button', { name: 'このチームに追加' }), n: 3, pad: 4, side: 'right' }] })
  await em.fill(''); await go(p, '/admin/teams/KYT', 3500)
  const clip2 = await region(p, [p.locator('thead').last(), p.locator('tbody tr').last()], { pad: 18 }); clip2.x = 200; clip2.width = 1080
  await shot(p, OUT + 'a19-team-members.png', { fullPage: true, clip: clip2, marks: [{ loc: p.locator('tbody tr').filter({ hasText: '中村 愛' }).getByText('外す'), n: 1, pad: 6, side: 'right' }, { loc: p.locator('tbody tr').filter({ hasText: '山田 花子' }).locator('td').nth(4), n: 2, pad: 2 }] })
  await p.locator('tbody tr').filter({ hasText: '中村 愛' }).getByText('外す').click(); await sleep(700)
  await shot(p, OUT + 'a20-team-remove.png', { clip: { x: 190, y: 150, width: 1090, height: 420 }, marks: [{ loc: p.getByRole('button', { name: '外す', exact: true }).last(), n: 1, pad: 4, side: 'right' }] })
  await p.getByRole('button', { name: 'やめる' }).click()
})
await step('a24', async () => {
  await go(p, '/admin/users', 3000); await p.locator('tbody tr').filter({ hasText: '山田 花子' }).click(); await sleep(3500)
  const open = p.getByText('答案を見る').first(); await open.click(); await sleep(1200)
  const card = p.getByText('到達度診断テスト', { exact: true }).last().locator('xpath=..')
  const bb = await card.boundingBox(); const sy = await p.evaluate(() => scrollY)
  await shot(p, OUT + 'a24-user-tests.png', { fullPage: true, clip: { x: 200, y: bb.y + sy - 14, width: 1080, height: Math.min(bb.height + 28, 620) }, marks: [{ loc: p.getByText(/答案を(見る|閉じる)/).first(), n: 1, pad: 5, side: 'right' }] })
})
await step('a25', async () => {
  await go(p, '/admin/history', 3000)
  await shot(p, OUT + 'a25-history.png', { fullPage: true, marks: [{ loc: p.locator('tbody tr').nth(1), n: 1, pad: 0 }, { loc: p.getByRole('button', { name: /次へ/ }), n: 2, pad: 4, side: 'right' }] })
})
await b.close()
