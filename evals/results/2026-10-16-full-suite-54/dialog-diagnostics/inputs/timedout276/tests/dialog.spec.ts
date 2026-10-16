import { readFile } from 'node:fs/promises'
import { extname, isAbsolute, relative, resolve } from 'node:path'

import { expect, test } from '@playwright/test'

const contentTypes: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
}

test.beforeEach(async ({ page }) => {
  const buildDirectory = resolve(import.meta.dirname, '../dist')
  await page.route('http://dialog.test/**', async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname)
    const requestedFile = resolve(buildDirectory, pathname === '/' ? 'index.html' : `.${pathname}`)
    const relativePath = relative(buildDirectory, requestedFile)
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      await route.abort('blockedbyclient')
      return
    }

    try {
      await route.fulfill({
        body: await readFile(requestedFile),
        contentType: contentTypes[extname(requestedFile)] ?? 'application/octet-stream',
      })
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' })
    }
  })
})

test('traps focus, closes with Escape, and restores the trigger', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('exposes modal semantics, description, portal, and background isolation', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription('Update your public information.')
  expect(await dialog.evaluate((element) => element.closest('[data-dialog-portal]')?.parentElement === document.body)).toBe(
    true,
  )
  await expect(page.locator('#root')).toHaveAttribute('inert', '')
  await expect(page.locator('#root')).toHaveAttribute('aria-hidden', 'true')

  await page.evaluate(() => (document.querySelector('main a') as HTMLElement).focus())
  await expect(dialog.getByLabel('Name')).toBeFocused()
})

test('supports controlled state and consumer-owned close copy', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Open controlled dialog' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Controlled dialog' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close controlled dialog' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keeps content interaction open and closes only from the top overlay', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })

  await dialog.getByLabel('Name').click()
  await expect(dialog).toBeVisible()
  await page.locator('.overlay').click({ position: { x: 4, y: 4 } })
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('hydrates stable server markup before mounting an open portal', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat|did not match/i.test(message.text())) hydrationErrors.push(message.text())
  })

  await page.goto('/hydration.html')
  const trigger = page.getByRole('button', { name: 'Open by default' })
  const dialog = page.getByRole('dialog', { name: 'Hydrated dialog' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toBeFocused()
  const dialogId = await dialog.getAttribute('id')
  expect(dialogId).not.toBeNull()
  await expect(trigger).toHaveAttribute('aria-controls', dialogId!)
  expect(hydrationErrors).toEqual([])
})

test('only the top nested dialog handles Escape and restores local focus', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Edit profile' }).click()
  const parent = page.getByRole('dialog', { name: 'Edit profile' })
  const nestedTrigger = parent.getByRole('button', { name: 'Open permissions' })
  await nestedTrigger.click()

  const child = page.getByRole('dialog', { name: 'Permissions' })
  await expect(child).toBeVisible()
  await expect(child.getByRole('button', { name: 'Save permissions' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(child).toBeHidden()
  await expect(parent).toBeVisible()
  await expect(nestedTrigger).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(parent).toBeHidden()
})
