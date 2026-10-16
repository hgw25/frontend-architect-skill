// @vitest-environment node

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
})

test('defers an initially open portal until the client mounts', () => {
  const html = renderToString(
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-label="Example">Content</Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>,
  )

  expect(html).toContain('Open')
  expect(html).not.toContain('Content')
})
