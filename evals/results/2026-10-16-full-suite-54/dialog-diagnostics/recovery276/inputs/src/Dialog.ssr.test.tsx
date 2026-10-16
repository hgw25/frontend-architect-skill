// @vitest-environment node

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Dialog } from './index'

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
  expect(html).not.toContain('Example')
})

test('defers an initially open portal until after hydration', () => {
  const html = renderToString(
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-label="Example">
          <button type="button">Action</button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  )

  expect(html).toContain('aria-expanded="true"')
  expect(html).not.toContain('role="dialog"')
})
