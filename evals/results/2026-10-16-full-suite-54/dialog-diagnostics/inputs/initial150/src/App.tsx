import { useState } from 'react'

import { Dialog } from './Dialog'
import './styles.css'

export function App() {
  const [profileOpen, setProfileOpen] = useState(false)

  return (
    <main>
      <a href="#background">Background link</a>
      <Dialog.Root open={profileOpen} onOpenChange={setProfileOpen}>
        <Dialog.Trigger>Edit profile</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay">
            <Dialog.Content className="dialog">
              <Dialog.Title>Edit profile</Dialog.Title>
              <Dialog.Description>
                Update your public information.
              </Dialog.Description>
              <label>
                Name
                <input name="name" defaultValue="Ada" />
              </label>
              <Dialog.Root>
                <Dialog.Trigger>Open permissions</Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="overlay nested-overlay">
                    <Dialog.Content className="dialog">
                      <Dialog.Title>Permissions</Dialog.Title>
                      <Dialog.Description>
                        Choose who can see this profile.
                      </Dialog.Description>
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
    </main>
  )
}
