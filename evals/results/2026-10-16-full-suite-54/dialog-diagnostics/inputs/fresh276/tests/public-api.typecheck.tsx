import { useState } from 'react'

import { Dialog, DialogContent, type DialogOpenChangeReason } from '../src/index'

export function PublicApiTypeFixture() {
  const [open, setOpen] = useState(false)
  const reason: DialogOpenChangeReason = 'escape-key'

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger>Open controlled dialog</Dialog.Trigger>
        <Dialog.Portal>
          <DialogContent aria-label={`Closed by ${reason}`}>
            <Dialog.Description>Controlled dialog description</Dialog.Description>
            Content
          </DialogContent>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root defaultOpen={false}>Uncontrolled dialog</Dialog.Root>
      {/* @ts-expect-error Controlled and uncontrolled inputs are mutually exclusive. */}
      <Dialog.Root open={open} defaultOpen={false}>
        Invalid ownership
      </Dialog.Root>
    </>
  )
}
