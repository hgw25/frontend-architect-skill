import assert from 'node:assert/strict'
import { chromium, expect } from '@playwright/test'
import { createServer } from 'vite'

// Host acceptance uses the supplied demo's public controls, independently of
// the implementation's chosen browser-test transport or package build layout.
const server = await createServer({
  server: { host: '127.0.0.1', port: 0, strictPort: true, middlewareMode: false },
  logLevel: 'error',
})
let browser
try {
  await server.listen()
  const address = server.httpServer.address()
  assert.ok(address && typeof address === 'object')
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}`)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Name')).toBeFocused()
  await page.locator('.overlay').click({ position: { x: 4, y: 4 } })
  await expect(dialog).toBeHidden()
  await page.evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect(trigger).toBeFocused()
  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  console.log('Host public-contract check passed: outside dismissal settles on trigger; reopen/Escape returns focus.')
} finally {
  await browser?.close()
  await server.close()
}
