import { test, expect } from '@playwright/test'

const button = (page: import('@playwright/test').Page, name: string) => page.getByRole('button', { name, exact: true })
const strips = '.gallop-strip'
type AnimationWindow = Window & { savedGallop?: Animation }

for (const width of [1440, 390]) {
  test(`gallop frames freeze, resume and stop independently of race progress at ${width}px`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 })
    await page.clock.install()
    await page.addInitScript(() => {
      let seed = 7841
      Math.random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    })
    await page.goto('/')
    await button(page, 'Generate').click()
    const horses = page.locator('.galloping-horse')
    await expect(horses).toHaveCount(10)
    await expect.poll(() => page.locator(strips).evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 1152))).toBe(true)
    expect(await horses.first().evaluate((horse) => horse.getBoundingClientRect().width)).toBe(width === 1440 ? 72 : 56)
    await expect(page.locator('[data-galloping="true"]')).toHaveCount(0)
    await button(page, 'Start Race').click()
    await expect(page.locator('[data-galloping="true"]')).toHaveCount(10)
    const firstTransform = await page.locator(strips).first().evaluate((image) => getComputedStyle(image).transform)
    await expect.poll(() => page.locator(strips).first().evaluate((image) => getComputedStyle(image).transform)).not.toBe(firstTransform)
    await page.locator(strips).first().evaluate((image) => { (window as AnimationWindow).savedGallop = image.getAnimations()[0]! })
    await page.clock.runFor(100)
    expect(await page.locator(strips).first().evaluate((image) => image.getAnimations()[0] === (window as AnimationWindow).savedGallop)).toBe(true)
    await page.screenshot({ path: info.outputPath(`${width}-galloping.png`), fullPage: true })
    await button(page, 'Pause').click()
    await expect(page.locator('[data-galloping="true"]')).toHaveCount(0)
    // A CSS pause can be pending until its compositor frame is committed. Bind
    // the frozen baseline to the settled animation, not that intermediate state.
    await page.locator(strips).evaluateAll(async (images) => {
      await Promise.all(images.flatMap((image) => image.getAnimations().map((animation) => animation.ready)))
    })
    const snapshot = () => page.locator(strips).evaluateAll((images) => images.map((image) => ({ transform: getComputedStyle(image).transform, time: image.getAnimations()[0]!.currentTime, state: image.getAnimations()[0]!.playState })))
    const frozen = await snapshot()
    expect(frozen.every((horse) => horse.state === 'paused')).toBe(true)
    // Bounded observation of a frozen CSS timeline, not an arbitrary readiness wait.
    await page.evaluate(() => new Promise((resolve) => window.setTimeout(resolve, 240)))
    expect(await snapshot()).toEqual(frozen)
    await page.screenshot({ path: info.outputPath(`${width}-paused.png`), fullPage: true })
    await button(page, 'Resume').click()
    expect(await page.locator(strips).first().evaluate((image) => image.getAnimations()[0] === (window as AnimationWindow).savedGallop)).toBe(true)
    await expect.poll(() => page.locator(strips).first().evaluate((image) => Number(image.getAnimations()[0]!.currentTime))).toBeGreaterThan(Number(frozen[0]!.time))
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.runner').first()).toBeHidden()
    expect(await page.locator(strips).first().evaluate((image) => image.getAnimations().length)).toBe(0)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const finished = page.locator('[data-race-lane]').filter({ has: page.locator('[data-galloping="false"]') })
    // Observe the first mixed finishing state instead of assuming screenshot and
    // browser overhead leave us at a particular elapsed time within round one.
    for (let step = 0; step < 60; step++) {
      if (await finished.count() > 0 && await page.locator('[data-galloping="true"]').count() > 0) break
      await page.clock.runFor(80)
    }
    await expect(page.locator('#race-track .meta')).toHaveText('Round 1 / 1200 m')
    await expect(finished).not.toHaveCount(0)
    await expect(page.locator('[data-galloping="true"]')).not.toHaveCount(0)
    for (const lane of await finished.all()) {
      expect(Number(await lane.evaluate((element) => (element as HTMLElement).style.getPropertyValue('--progress')))).toBe(1)
      expect(await lane.locator(strips).evaluate((image) => image.getAnimations()[0]!.playState)).toBe('paused')
    }
    await page.clock.runFor(45_000)
    await expect(page.locator('.phase')).toHaveText('Completed')
    await expect(page.locator('[data-result-finisher]')).toHaveCount(60)
    await expect(page.locator('[data-galloping="true"]')).toHaveCount(0)
    expect((await snapshot()).every((horse) => horse.state === 'paused')).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.runner').first()).toBeHidden()
    expect(await page.locator(strips).first().evaluate((image) => image.getAnimations().length)).toBe(0)
    await expect(page.locator('.motion-note')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
