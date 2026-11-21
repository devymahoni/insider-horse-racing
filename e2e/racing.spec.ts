import { test, expect, type Page, type TestInfo } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { writeFile } from 'node:fs/promises'

const distances = [1200, 1400, 1600, 1800, 2000, 2200]
const targets = [5, 5.8, 6.6, 7.4, 8.2, 9]
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const phase = (page: Page) => page.locator('.phase')
const progress = (page: Page) => page.locator('[data-race-lane]').evaluateAll((lanes) => lanes.map((lane) => lane.getAttribute('style')))

async function scan(page: Page, state: string, info: TestInfo) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  await info.attach(`axe-${state}`, { body: JSON.stringify(result.violations, null, 2), contentType: 'application/json' })
  expect(result.violations, `${state} accessibility violations`).toEqual([])
}

async function assertSchedule(page: Page) {
  await expect(page.locator('[data-horse-row]')).toHaveCount(20)
  const rounds = page.locator('[data-program-round]')
  await expect(rounds).toHaveCount(6)
  for (const [index, distance] of distances.entries()) {
    await expect(rounds.nth(index)).toContainText(`${distance} m`)
    const names = await rounds.nth(index).locator('.participants li').allTextContents()
    expect(names).toHaveLength(10)
    expect(new Set(names).size).toBe(10)
  }
  await expect(page.locator('[data-race-lane]')).toHaveCount(10)
}

async function assertLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const controls = page.locator('.control-buttons button')
  await expect(controls).toHaveCount(2)
  for (const control of await controls.all()) {
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(await page.evaluate(() => innerWidth))
  }
  await expect(page.locator('[data-race-lane]')).toHaveCount(10)
  await expect(page.locator('.start-line').first()).toBeVisible()
  await expect(page.locator('.finish-line').first()).toBeVisible()
  await expect(page.locator('.finish-label')).toContainText('Finish')
}

test('real-time six-round workflow, guarded actions, retained results and accessibility', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page).toHaveTitle(/Insider Racing/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Insider Racing')
  await expect(phase(page)).toHaveText('Idle')
  await expect(button(page, 'Start Race')).toBeDisabled()
  await scan(page, 'idle', info)
  await button(page, 'Generate').focus()
  await page.keyboard.press('Enter')
  await expect(phase(page)).toHaveText('Ready')
  await assertSchedule(page)
  await scan(page, 'ready', info)
  const primary = page.locator('.primary-action')
  const primaryElement = await primary.elementHandle()
  await primary.focus()
  await page.keyboard.press('Enter')
  await expect(phase(page)).toHaveText('Running')
  await expect(button(page, 'Pause')).toBeFocused()
  expect(await primary.evaluate((element, original) => element === original, primaryElement)).toBe(true)
  await page.keyboard.down('Enter')
  await page.keyboard.down('Enter')
  await page.keyboard.up('Enter')
  // The first fresh Enter pauses; its repeated keydown must not immediately resume.
  await expect(phase(page)).toHaveText('Paused')
  await expect(button(page, 'Resume')).toBeFocused()
  await page.keyboard.press('Space')
  await expect(phase(page)).toHaveText('Running')
  await expect(button(page, 'Pause')).toBeFocused()
  await expect(button(page, 'Generate')).toBeDisabled()
  await expect(button(page, 'Pause')).toBeEnabled()
  const initial = await progress(page)
  await expect.poll(() => progress(page)).not.toEqual(initial)
  const runningTop = await page.locator('#race-track').evaluate((element) => element.getBoundingClientRect().top)
  await page.keyboard.press('Space')
  await expect(phase(page)).toHaveText('Paused')
  await expect(button(page, 'Resume')).toBeFocused()
  expect(await page.locator('#race-track').evaluate((element) => element.getBoundingClientRect().top)).toBe(runningTop)
  const frozen = await progress(page)
  // A bounded observation interval proves absence of movement, rather than waiting for readiness.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 250)))
  expect(await progress(page)).toEqual(frozen)
  await expect(button(page, 'Generate')).toBeDisabled()
  await expect(button(page, 'Resume')).toBeEnabled()
  await scan(page, 'paused', info)
  await page.keyboard.press('Enter')
  await expect(button(page, 'Pause')).toBeFocused()
  expect(await primary.evaluate((element, original) => element === original, primaryElement)).toBe(true)
  await expect.poll(() => progress(page)).not.toEqual(frozen)
  // Observe each prefix, so a final count alone cannot hide missing/duplicate round publication.
  for (let count = 1; count <= 6; count++) {
    await expect(page.locator('[data-result-round]')).toHaveCount(count, { timeout: 15_000 })
    await expect(page.locator('[data-result-round]').last().locator('summary')).toContainText(`Round ${count}`)
    await expect(page.locator('[data-result-round]').last().locator('[data-result-finisher]')).toHaveCount(10)
  }
  await expect(phase(page)).toHaveText('Completed')
  await expect(page.locator('[data-result-finisher]')).toHaveCount(60)
  for (let index = 0; index < 6; index++) {
    const times = await page.locator('[data-result-round]').nth(index).locator('tbody .numeric').allTextContents()
    expect(Number.parseFloat(times.at(-1)!)).toBe(targets[index])
  }
  await expect(button(page, 'Race complete')).toBeDisabled()
  await scan(page, 'completed', info)
  await button(page, 'Generate').click()
  await expect(phase(page)).toHaveText('Ready')
  await expect(page.locator('[data-result-finisher]')).toHaveCount(0)
  await assertSchedule(page)
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1440]) {
  test(`responsive states and keyboard disclosure at ${width}px (controlled browser clock)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install()
    await page.goto('/')
    await button(page, 'Generate').click()
    await assertSchedule(page)
    await assertLayout(page)
    await page.screenshot({ path: info.outputPath(`${width}-ready.png`), fullPage: true })
    if (width < 761) {
      const toggle = page.getByRole('button', { name: 'Show all 20 horses' })
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await toggle.focus(); await page.keyboard.press('Space')
      await expect(page.locator('#horse-roster')).toBeVisible()
      await expect(page.locator('[data-horse-row]:visible')).toHaveCount(20)
      await page.keyboard.press('Enter')
      await expect(toggle).toHaveAttribute('aria-expanded', 'false')
      await expect(page.locator('#horse-roster')).toBeHidden()
      await expect(page.getByRole('heading', { name: 'Horse Pool' }).locator('..')).toContainText('20 / 20')
    }
    await button(page, 'Start Race').dblclick()
    await page.clock.runFor(600)
    await expect(phase(page)).toHaveText('Running')
    await assertLayout(page)
    await page.screenshot({ path: info.outputPath(`${width}-running.png`), fullPage: true })
    const top = await page.locator('#race-track').evaluate((element) => element.getBoundingClientRect().top)
    await button(page, 'Pause').click()
    await expect(phase(page)).toHaveText('Paused')
    expect(await page.locator('#race-track').evaluate((element) => element.getBoundingClientRect().top)).toBe(top)
    const frozen = await progress(page)
    await page.clock.runFor(500)
    expect(await progress(page)).toEqual(frozen)
    await page.screenshot({ path: info.outputPath(`${width}-paused.png`), fullPage: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.runner').first()).toBeHidden()
    await expect(page.locator('.motion-note')).toBeVisible()
    await assertLayout(page)
    if (width === 320) await scan(page, 'mobile-reduced-paused', info)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await button(page, 'Resume').click()
    await page.clock.runFor(45_000)
    await expect(phase(page)).toHaveText('Completed')
    await expect(page.locator('[data-result-finisher]')).toHaveCount(60)
    await assertLayout(page)
    await page.screenshot({ path: info.outputPath(`${width}-completed.png`), fullPage: true })
    await page.locator('[data-result-round]').first().locator('summary').click()
    await expect(page.locator('[data-result-round]').first()).toHaveAttribute('open', '')
    await expect(page.locator('[data-result-round]').last()).toHaveAttribute('open', '')
    if (width === 320) await scan(page, 'mobile-expanded-results', info)
  })
}

test('bounded rendering measurements and throttled-device observation', async ({ page }, info) => {
  await page.goto('/')
  await button(page, 'Generate').click()
  await button(page, 'Start Race').click()
  const measure = () => page.evaluate(async () => {
    const intervals: number[] = []
    const longTasks: number[] = []
    const mutations = { pool: 0, program: 0, results: 0 }
    const observers = (Object.keys(mutations) as Array<keyof typeof mutations>).map((key) => {
      const selector = { pool: '.pool-column', program: '.program-column', results: '[aria-labelledby="results-heading"]' }[key]!
      const observer = new MutationObserver((records) => { mutations[key as keyof typeof mutations] += records.length })
      observer.observe(document.querySelector(selector)!, { subtree: true, childList: true, characterData: true, attributes: true })
      return observer
    })
    const performanceObserver = new window.PerformanceObserver((list) => { longTasks.push(...list.getEntries().map((entry) => entry.duration)) })
    performanceObserver.observe({ type: 'longtask', buffered: false })
    let previous = performance.now()
    await new Promise<void>((resolve) => {
      function frame(now: number) {
        intervals.push(now - previous); previous = now
        if (intervals.length < 60) requestAnimationFrame(frame)
        else resolve()
      }
      requestAnimationFrame(frame)
    })
    observers.forEach((observer) => observer.disconnect()); performanceObserver.disconnect()
    const sorted = intervals.slice(1).sort((a, b) => a - b)
    return { frames: sorted.length, medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.floor(sorted.length * .95)], longTasks: longTasks.length, longestTaskMs: Math.max(0, ...longTasks), mutations }
  })
  const normal = await measure()
  expect(normal.mutations).toEqual({ pool: 0, program: 0, results: 0 })
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const throttled = await measure()
  await session.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await session.detach()
  await expect(phase(page)).toHaveText(/Running|Paused/)
  const measurements = JSON.stringify({ environment: 'Headless Chromium; 60-frame samples; 4x CPU slowdown is emulation, not a physical device', normal, throttled }, null, 2)
  await writeFile(info.outputPath('rendering-measurements.json'), measurements)
  await info.attach('rendering-measurements', { body: measurements, contentType: 'application/json' })
  // Cleanup semantics are independently covered by injected-runtime listener/frame tests.
  if (await phase(page).textContent() === 'Running') await button(page, 'Pause').click()
})
