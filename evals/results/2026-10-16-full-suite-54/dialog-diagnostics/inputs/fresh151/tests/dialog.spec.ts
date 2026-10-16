import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

async function openBuiltFixture(page: Page) {
  const outputDirectory = path.resolve('dist')
  let html = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')
  const scriptPath = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/)?.[1]
  const stylePath = html.match(/<link rel="stylesheet" crossorigin href="([^"]+)">/)?.[1]

  if (!scriptPath || !stylePath) throw new Error('Vite output is missing its script or stylesheet')

  const [script, style] = await Promise.all([
    readFile(path.join(outputDirectory, scriptPath), 'utf8'),
    readFile(path.join(outputDirectory, stylePath), 'utf8'),
  ])
  html = html
    .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/, '')
    .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/, `<style>${style}</style>`)

  await page.setContent(html, { waitUntil: 'load' })
  await page.addScriptTag({ content: script, type: 'module' })
  await page.getByRole('button', { name: 'Edit profile' }).waitFor()
}

test('controlled dialog traps focus, closes with Escape, and restores the trigger', async ({
  page,
}) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })

  await openBuiltFixture(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription('Update your public information.')
  await expect(dialog.getByLabel('Name')).toBeFocused()
  await expect(page.locator('body > .overlay')).toHaveCount(1)
  await expect(page.locator('#root')).toHaveAttribute('aria-hidden', 'true')

  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await expect(page.locator('#root')).not.toHaveAttribute('aria-hidden', 'true')
  expect(browserErrors).toEqual([])
})

test('only the top nested dialog handles Escape and restores local focus', async ({ page }) => {
  await openBuiltFixture(page)
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

test('keeps programmatic focus inside the active layer and closes from the backdrop', async ({
  page,
}) => {
  await openBuiltFixture(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await page.locator('a', { hasText: 'Background link' }).evaluate((element) => element.focus())
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.getByTestId('profile-overlay').click({ position: { x: 2, y: 2 } })
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})
