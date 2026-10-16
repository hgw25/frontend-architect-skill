const publicModule = await import('@fixture/headless-dialog')

const expectedExports = [
  'Dialog',
  'DialogClose',
  'DialogContent',
  'DialogDescription',
  'DialogOverlay',
  'DialogPortal',
  'DialogRoot',
  'DialogTitle',
  'DialogTrigger',
]

for (const exportName of expectedExports) {
  if (!(exportName in publicModule)) {
    throw new Error(`Missing public package export: ${exportName}`)
  }
}

if (publicModule.Dialog.Root !== publicModule.DialogRoot) {
  throw new Error('Dialog.Root must reference the named DialogRoot export')
}

console.log('Public package exports are loadable')
