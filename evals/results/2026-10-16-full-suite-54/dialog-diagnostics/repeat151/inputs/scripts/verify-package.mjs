import assert from 'node:assert/strict'

const publicApi = await import('../dist/package/index.js')

assert.deepEqual(
  Object.keys(publicApi).sort(),
  [
    'Dialog',
    'DialogClose',
    'DialogContent',
    'DialogDescription',
    'DialogOverlay',
    'DialogPortal',
    'DialogRoot',
    'DialogTitle',
    'DialogTrigger',
  ],
)
