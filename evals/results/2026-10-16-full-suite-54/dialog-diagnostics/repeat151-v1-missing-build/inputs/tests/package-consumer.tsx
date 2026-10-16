import { createRef } from 'react'

import {
  Dialog,
  DialogContent,
  type DialogOpenChangeDetails,
} from 'frontend-architect-dialog-browser-eval'

const contentRef = createRef<HTMLDivElement>()
const handleOpenChange = (_open: boolean, details: DialogOpenChangeDetails) => details.reason

export const consumerExample = (
  <Dialog.Root defaultOpen={false} onOpenChange={handleOpenChange}>
    <Dialog.Trigger>Open</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay>
        <DialogContent ref={contentRef} aria-label="Example" aria-describedby={undefined}>
          Content
          <Dialog.Close>Close</Dialog.Close>
        </DialogContent>
      </Dialog.Overlay>
    </Dialog.Portal>
  </Dialog.Root>
)
