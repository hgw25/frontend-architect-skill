import { expect, test } from '@playwright/test'

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
