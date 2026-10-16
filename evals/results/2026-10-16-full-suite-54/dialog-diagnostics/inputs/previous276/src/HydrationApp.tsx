import { Dialog } from './index'

export function HydrationApp() {
  return (
    <main>
      <Dialog.Root>
        <Dialog.Trigger>Hydration dialog</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay">
            <Dialog.Content className="dialog">
              <Dialog.Title>Hydrated content</Dialog.Title>
              <Dialog.Description>The portal mounted after hydration.</Dialog.Description>
              <Dialog.Close>Close</Dialog.Close>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  )
}
