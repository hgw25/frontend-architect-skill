// @vitest-environment node

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Dialog } from './index'

test('renders the closed primitive without accessing browser globals', () => {
  const html = renderToString(
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content>
            <Dialog.Title>Example</Dialog.Title>
            <Dialog.Description>Description</Dialog.Description>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>,
  )

  expect(html).toContain('Open')
  expect(html).toContain('aria-expanded="false"')
  expect(html).not.toContain('role="dialog"')
})

test('defers an initially open portal until the client without reading document', () => {
  const html = renderToString(
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-label="Example">Content</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  )

  expect(html).toContain('aria-expanded="true"')
  expect(html).not.toContain('Content')
})
