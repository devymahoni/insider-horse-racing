import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  updateSnapshots: 'none',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/visual.spec.ts', '**/smoke.spec.ts'],
      use: { browserName: 'chromium' },
    },
    {
      name: 'visual-chromium',
      testMatch: '**/visual.spec.ts',
      use: {
        browserName: 'chromium',
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',
        reducedMotion: 'no-preference',
      },
    },
    {
      name: 'firefox-smoke',
      testMatch: '**/smoke.spec.ts',
      use: { browserName: 'firefox' },
    },
    {
      name: 'webkit-smoke',
      testMatch: '**/smoke.spec.ts',
      use: { browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
})
