import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { expect, test, type Page } from '@playwright/test'

async function openBuiltFixture(page: Page) {
  const assetsDirectory = resolve('dist/app/assets')
  const assets = await readdir(assetsDirectory)
  const scriptPath = assets.find((asset) => asset.endsWith('.js'))
  const stylesheetPath = assets.find((asset) => asset.endsWith('.css'))

  if (!scriptPath || !stylesheetPath) {
    throw new Error('Expected the Vite fixture to emit JavaScript and CSS assets')
  }

  const [script, stylesheet] = await Promise.all([
    readFile(resolve(assetsDirectory, scriptPath), 'utf8'),
    readFile(resolve(assetsDirectory, stylesheetPath), 'utf8'),
  ])

  await page.setContent(`
    <!doctype html>
    <html lang="en">
      <head><style>${stylesheet}</style></head>
      <body>
        <div id="root"></div>
        <script type="module">${script.replaceAll('</script', '<\\/script')}</script>
      </body>
    </html>
  `)
  await expect(page.getByRole('button', { name: 'Edit profile' })).toBeVisible()
}

test('traps focus, closes with Escape, and restores the trigger', async ({ page }) => {
  await openBuiltFixture(page)
  const trigger = page
    .locator('button')
    .filter({ hasText: /^Edit profile$/ })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription(
    'Update your public information.',
  )
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect
    .poll(() =>
      page
        .locator('#root')
        .evaluate((element) => (element as HTMLElement).inert),
    )
    .toBe(true)
  await expect(page.locator('body > [data-dialog-portal]')).toHaveCount(1)
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect
    .poll(() =>
      page
        .locator('#root')
        .evaluate((element) => (element as HTMLElement).inert),
    )
    .toBe(false)
  await expect(trigger).toBeFocused()
})

test('only the top nested dialog handles Escape and restores local focus', async ({ page }) => {
  await openBuiltFixture(page)
  await page.getByRole('button', { name: 'Edit profile' }).click()
  const parent = page
    .locator('[role="dialog"]')
    .filter({ hasText: 'Edit profile' })
  const nestedTrigger = parent.getByRole('button', { name: 'Open permissions' })
  await nestedTrigger.click()

  const child = page.getByRole('dialog', { name: 'Permissions' })
  await expect(child).toBeVisible()
  await expect(child).toHaveAccessibleDescription(
    'Choose who can see this profile.',
  )
  await expect(child.getByRole('button', { name: 'Save permissions' })).toBeFocused()
  await expect
    .poll(() =>
      parent.evaluate(
        (element) =>
          element.closest<HTMLElement>('[data-dialog-portal]')?.inert ?? false,
      ),
    )
    .toBe(true)

  await page.keyboard.press('Escape')
  await expect(child).toBeHidden()
  await expect(parent).toBeVisible()
  await expect
    .poll(() =>
      parent.evaluate(
        (element) =>
          element.closest<HTMLElement>('[data-dialog-portal]')?.inert ?? false,
      ),
    )
    .toBe(false)
  await expect(nestedTrigger).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(parent).toBeHidden()
})

test('dismisses only the active dialog through an outside pointer interaction', async ({
  page,
}) => {
  await openBuiltFixture(page)
  const trigger = page
    .locator('button')
    .filter({ hasText: /^Edit profile$/ })
  await trigger.click()
  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeVisible()

  await page.mouse.click(5, 5)

  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeHidden()
  await expect(trigger).toBeFocused()
})
