import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 3,
  use: {
    ...devices['Desktop Chrome'],
    launchOptions: {
      // Keeps the fixture runnable in restricted macOS CI sandboxes.
      args: ['--single-process'],
    },
  },
})
