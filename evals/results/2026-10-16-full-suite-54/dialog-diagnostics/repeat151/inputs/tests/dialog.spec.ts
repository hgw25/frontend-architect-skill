import { readFile } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

import { expect, test } from '@playwright/test'

const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
}

test.beforeEach(async ({ page }) => {
  await page.route('http://dialog.test/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1)

    try {
      const body = await readFile(resolve(process.cwd(), 'dist/demo', relativePath))
      await route.fulfill({
        body,
        contentType: contentTypes[extname(relativePath)] ?? 'application/octet-stream',
        status: 200,
      })
    } catch {
      await route.fulfill({ body: 'Not found', status: 404 })
    }
  })
})

test('hydrates the server markup without changing the closed experience', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|did not match/i.test(message.text())) {
      hydrationErrors.push(message.text())
    }
  })

  await page.goto('/')

  await expect(page.locator('#root')).toHaveAttribute('data-ssr', 'true')
  await expect(page.getByRole('button', { name: 'Edit profile' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(hydrationErrors).toEqual([])
})

test('traps focus, closes with Escape, and restores the trigger', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription('Update your public information.')
  await expect(dialog.getByLabel('Name')).toBeFocused()
  await expect(page.locator('#root')).toHaveJSProperty('inert', true)
  await expect(page.locator('body > [data-dialog-portal]')).toHaveCount(1)

  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('only the top nested dialog handles Escape and restores local focus', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Edit profile' }).click()
  const parent = page.getByRole('dialog', { name: 'Edit profile' })
  const nestedTrigger = parent.getByRole('button', { name: 'Open permissions' })
  await nestedTrigger.click()

  const child = page.getByRole('dialog', { name: 'Permissions' })
  await expect(child).toBeVisible()
  await expect(child).toHaveAccessibleDescription('Choose who can see this profile.')
  await expect(child.getByRole('button', { name: 'Save permissions' })).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(child.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(child.getByRole('button', { name: 'Save permissions' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(child).toBeHidden()
  await expect(parent).toBeVisible()
  await expect(nestedTrigger).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(parent).toBeHidden()
})

test('dismisses from the overlay and restores focus', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  await page.locator('.overlay').click({ position: { x: 4, y: 4 } })

  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('#root')).toHaveJSProperty('inert', false)
})
