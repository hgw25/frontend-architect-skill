// @vitest-environment node

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Dialog } from './Dialog'

function ExampleDialog({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog.Root defaultOpen={defaultOpen}>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay>
          <Dialog.Content>
            <Dialog.Title>Example</Dialog.Title>
            <Dialog.Description>Description</Dialog.Description>
            <button type="button">Action</button>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

test('renders the closed primitive without accessing browser globals', () => {
  const html = renderToString(<ExampleDialog />)

  expect(html).toContain('Open')
  expect(html).toContain('aria-expanded="false"')
  expect(html).not.toContain('role="dialog"')
})

test('keeps an initially open portal hydration-safe on the server', () => {
  const html = renderToString(<ExampleDialog defaultOpen />)

  expect(html).toContain('aria-expanded="true"')
  expect(html).not.toContain('role="dialog"')
})
