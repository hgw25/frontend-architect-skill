import { useState } from 'react'

import { Dialog } from './index'
import './styles.css'

function ControlledDialogExample() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>Open controlled dialog</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay">
          <Dialog.Content className="dialog">
            <Dialog.Title>Controlled dialog</Dialog.Title>
            <Dialog.Description>Its open state belongs to the product.</Dialog.Description>
            <Dialog.Close>Close controlled dialog</Dialog.Close>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function App() {
  return (
    <main>
      <a href="#background">Background link</a>
      <Dialog.Root>
        <Dialog.Trigger>Edit profile</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay">
            <Dialog.Content className="dialog">
              <Dialog.Title>Edit profile</Dialog.Title>
              <Dialog.Description>Update your public information.</Dialog.Description>
              <label>
                Name
                <input name="name" defaultValue="Ada" />
              </label>
              <Dialog.Root>
                <Dialog.Trigger>Open permissions</Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="overlay">
                    <Dialog.Content className="dialog">
                      <Dialog.Title>Permissions</Dialog.Title>
                      <Dialog.Description>Choose who can see this profile.</Dialog.Description>
                      <button type="button">Save permissions</button>
                      <Dialog.Close>Close</Dialog.Close>
                    </Dialog.Content>
                  </Dialog.Overlay>
                </Dialog.Portal>
              </Dialog.Root>
              <Dialog.Close>Close</Dialog.Close>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
      <ControlledDialogExample />
    </main>
  )
}
