import { expect, test } from '@playwright/test'
import path from 'node:path'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { HydrationApp } from '../src/HydrationApp'

const fixtureScript = path.join(process.cwd(), 'dist/browser-test/fixture.iife.js')
const fixtureStyles = path.join(process.cwd(), 'dist/browser-test/fixture.css')

async function openFixture(page: import('@playwright/test').Page) {
  await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>')
  await page.addStyleTag({ path: fixtureStyles })
  await page.addScriptTag({ path: fixtureScript })
}

async function openHydrationFixture(page: import('@playwright/test').Page) {
  const serverMarkup = renderToString(createElement(HydrationApp))
  await page.setContent(`<!doctype html>
    <html data-fixture="hydration"><body>
      <div id="root">${serverMarkup}</div>
    </body></html>`)
  await page.addStyleTag({ path: fixtureStyles })
  await page.addScriptTag({ path: fixtureScript })
}

test('traps focus, closes with Escape, and restores the trigger', async ({ page }) => {
  await openFixture(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Edit profile' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAttribute('aria-modal', 'true')
  await expect(dialog).toHaveAccessibleDescription('Update your public information.')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByLabel('Name')).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('keeps programmatic focus inside and closes through the consumer overlay', async ({ page }) => {
  await openFixture(page)
  const trigger = page.getByRole('button', { name: 'Edit profile' })
  await trigger.click()

  await page.getByRole('link', { name: 'Background link' }).focus()
  await expect(page.getByRole('dialog').getByLabel('Name')).toBeFocused()

  await page.getByTestId('profile-overlay').click({ position: { x: 5, y: 5 } })
  await expect(page.getByRole('dialog', { name: 'Edit profile' })).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('only the top nested dialog handles Escape and restores local focus', async ({ page }) => {
  await openFixture(page)
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

test('supports a controlled owner and a composed Close control', async ({ page }) => {
  await openFixture(page)
  const trigger = page.getByRole('button', { name: 'Open controlled dialog' })
  await trigger.click()

  const dialog = page.getByRole('dialog', { name: 'Controlled example' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Done' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
})

test('hydrates the server shell before opening a portal', async ({ page }) => {
  const hydrationErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat/i.test(message.text())) {
      hydrationErrors.push(message.text())
    }
  })

  await openHydrationFixture(page)
  await page.getByRole('button', { name: 'Hydration dialog' }).click()
  await expect(page.getByRole('dialog', { name: 'Hydrated content' })).toBeVisible()
  expect(hydrationErrors).toEqual([])
})
