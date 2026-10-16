// @vitest-environment node

import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'

import { Dialog } from './Dialog'

test('renders the closed primitive without accessing browser globals', () => {
  const html = renderToString(
    <Dialog title="Example" description="Description" triggerLabel="Open">
      <button type="button">Action</button>
    </Dialog>,
  )

  expect(html).toContain('Open')
})
