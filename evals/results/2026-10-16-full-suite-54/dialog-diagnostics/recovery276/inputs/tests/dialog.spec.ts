import { expect, test } from '@playwright/test'

test('hydrates the closed tree before mounting a portal', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/?hydrate=1')
  await page.getByRole('button', { name: 'Edit profile' }).click()

  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible()
  expect(consoleErrors).toEqual([])
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

test('exposes modal relationships through the portal and isolates the page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Edit profile' }).click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  const titleId = await dialog.getAttribute('aria-labelledby')
  const descriptionId = await dialog.getAttribute('aria-describedby')

  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(page.locator('body > [data-dialog-portal]')).toHaveCount(1)
  await expect(page.locator(`[id="${titleId}"]`)).toHaveText('Edit profile')
  await expect(page.locator(`[id="${descriptionId}"]`)).toHaveText('Update your public information.')
  await expect(page.locator('#root')).toHaveAttribute('inert', '')
  await expect(page.locator('#root')).toHaveAttribute('aria-hidden', 'true')

  await page.mouse.click(1, 1)
  await expect(dialog).toBeHidden()
  await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeFocused()
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

  await page.evaluate(() => document.querySelector<HTMLAnchorElement>('#root a')?.focus())
  await expect(child.getByRole('button', { name: 'Save permissions' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(child).toBeHidden()
  await expect(parent).toBeVisible()
  await expect(nestedTrigger).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(parent).toBeHidden()
})
