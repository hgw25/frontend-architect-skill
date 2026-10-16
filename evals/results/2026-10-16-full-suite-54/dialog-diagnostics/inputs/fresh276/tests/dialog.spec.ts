import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function builtDemoHtml() {
  const outputDirectory = resolve('dist-demo')
  let html = readFileSync(resolve(outputDirectory, 'index.html'), 'utf8')

  html = html.replace(
    /<script type="module" crossorigin src="([^"]+)"><\/script>/,
    (_, source: string) => {
      const script = readFileSync(resolve(outputDirectory, source.slice(1)), 'utf8')
      return `<script type="module">${script}</script>`
    },
  )
  html = html.replace(/<link rel="stylesheet" crossorigin href="([^"]+)">/, (_, source: string) => {
    const css = readFileSync(resolve(outputDirectory, source.slice(1)), 'utf8')
    return `<style>${css}</style>`
  })

  return html
}

async function openDemo(page: Page) {
  await page.setContent(builtDemoHtml())
}

test('traps focus, closes with Escape, and restores the trigger', async ({ page }) => {
  await openDemo(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription('Update your public information.')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.locator('a', { hasText: 'Background link' }).evaluate((element) => element.focus())
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
  await openDemo(page)
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

test('clicking the top overlay dismisses without leaking product styling into the primitive', async ({
  page,
}) => {
  await openDemo(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Edit profile' })

  await expect(dialog).toHaveCSS('display', 'grid')

  await page.locator('.overlay').click({ position: { x: 4, y: 4 } })

  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
