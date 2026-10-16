import {
  Dialog,
  DialogContent,
  type DialogContentProps,
  type DialogRootProps,
} from 'frontend-architect-dialog-browser-eval'

const controlledRoot: DialogRootProps = {
  children: null,
  onOpenChange: (_open) => undefined,
  open: true,
}

const contentProps: DialogContentProps = {
  'aria-label': 'Consumer dialog',
  className: 'consumer-panel',
}

export function PackageConsumer() {
  return (
    <Dialog.Root {...controlledRoot}>
      <Dialog.Portal>
        <DialogContent {...contentProps} />
      </Dialog.Portal>
    </Dialog.Root>
  )
}
