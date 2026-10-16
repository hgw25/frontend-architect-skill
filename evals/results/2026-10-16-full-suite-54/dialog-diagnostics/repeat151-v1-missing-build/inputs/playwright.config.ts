import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://dialog.test',
  },
})
