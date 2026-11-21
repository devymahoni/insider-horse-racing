import { expect, test, type Page } from '@playwright/test'

async function expectRunnerAlignment(page: Page, finished: boolean) {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const offsets = await page.locator('.runner').evaluateAll((runners, atFinish) => runners.map((runner) => {
      const box = runner.getBoundingClientRect()
      const runway = runner.parentElement!.getBoundingClientRect()
      return Math.abs(atFinish ? box.right - runway.right : box.left - runway.left)
    }), finished)
    expect(offsets).toHaveLength(10)
    expect(Math.max(...offsets)).toBeLessThan(1)
  }
}

test('essential racing controls and start/finish alignment', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'))
  await page.goto('/')
  await expect(page).toHaveTitle(/Insider Racing/)
  await expect(page.getByRole('button', { name: 'Start Race', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await expect(page.locator('[data-horse-row]')).toHaveCount(20)
  await expect(page.locator('[data-program-round]')).toHaveCount(6)
  for (const round of await page.locator('[data-program-round]').all()) {
    const names = await round.locator('.participants li').allTextContents()
    expect(names).toHaveLength(10)
    expect(new Set(names).size).toBe(10)
  }
  await expectRunnerAlignment(page, false)
  await page.setViewportSize({ width: 390, height: 900 })
  const primary = page.locator('.primary-action')
  const primaryElement = await primary.elementHandle()
  await primary.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  await page.clock.runFor(400)
  await expect(page.locator('.phase')).toHaveText('Running')
  await expect(page.getByRole('button', { name: 'Generate', exact: true })).toBeDisabled()
  await page.keyboard.press('Space')
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeFocused()
  const paused = await page.locator('[data-race-lane]').evaluateAll((lanes) => lanes.map((lane) => lane.getAttribute('style')))
  await page.clock.runFor(500)
  expect(await page.locator('[data-race-lane]').evaluateAll((lanes) => lanes.map((lane) => lane.getAttribute('style')))).toEqual(paused)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeFocused()
  expect(await primary.evaluate((element, original) => element === original, primaryElement)).toBe(true)
  await page.clock.runFor(400)
  await expect(page.locator('.phase')).toHaveText('Running')
  expect(await page.locator('[data-race-lane]').evaluateAll((lanes) => lanes.map((lane) => lane.getAttribute('style')))).not.toEqual(paused)
  await page.clock.runFor(45_000)
  await expect(page.locator('.phase')).toHaveText('Completed')
  await expectRunnerAlignment(page, true)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.getByRole('link', { name: 'Back to race controls' }).click()
  await expect(page.locator('#race-controls')).toBeFocused()
  const controls = await page.locator('#race-controls').boundingBox()
  expect(controls!.y).toBeGreaterThanOrEqual(0)
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(900)
  expect(errors).toEqual([])
})
