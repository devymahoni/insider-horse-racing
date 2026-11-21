import { expect, test } from '@playwright/test'

// Baselines are platform-specific because the accepted design uses system fonts.
// Generated candidates preserve the accepted design foundation; images/gait await human acceptance.
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') })
  await page.clock.pauseAt(new Date('2026-01-01T12:00:01Z'))
  await page.addInitScript(() => {
    let seed = 7841
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  // Keep the actual runners visible, but freeze decorative motion at frame zero.
  await page.addStyleTag({ content: '.gallop-strip { animation: none !important; transform: none !important; }' })
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
  await page.mouse.move(0, 0)
})

test('desktop Ready', async ({ page }) => {
  await expect(page.locator('.phase')).toHaveText('Ready')
  await expect(page).toHaveScreenshot('desktop-ready.png', { fullPage: true, animations: 'disabled' })
})

test('desktop Completed', async ({ page }) => {
  await page.getByRole('button', { name: 'Start Race', exact: true }).click()
  await page.clock.runFor(45_000)
  await expect(page.locator('.phase')).toHaveText('Completed')
  await expect(page.locator('[data-result-finisher]')).toHaveCount(60)
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot('desktop-completed.png', { fullPage: true, animations: 'disabled' })
})

test('mobile Paused', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Start Race', exact: true }).click()
  await page.clock.runFor(800)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('.phase')).toHaveText('Paused')
  await page.mouse.move(0, 0)
  await expect(page).toHaveScreenshot('mobile-paused.png', { fullPage: true, animations: 'disabled' })
})
