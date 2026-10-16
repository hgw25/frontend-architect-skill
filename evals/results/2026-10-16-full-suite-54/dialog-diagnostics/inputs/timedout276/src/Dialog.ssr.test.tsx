// @vitest-environment node

import { readFileSync } from 'node:fs'

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Dialog } from './Dialog'

test('renders the closed primitive without accessing browser globals', () => {
  const html = renderToString(
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content>
          <Dialog.Title>Example</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  )

  expect(html).toContain('Open')
  expect(html).not.toContain('role="dialog"')
})

test('matches the default-open markup used by the browser hydration fixture', () => {
  const html = renderToString(
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open by default</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-label="Hydrated dialog" />
      </Dialog.Portal>
    </Dialog.Root>,
  )
  const hydrationFixture = readFileSync(new URL('../hydration.html', import.meta.url), 'utf8')

  expect(hydrationFixture).toContain(html)
  expect(html).not.toContain('role="dialog"')
})
