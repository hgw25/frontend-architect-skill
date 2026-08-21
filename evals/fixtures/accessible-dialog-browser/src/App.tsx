import { Dialog } from './Dialog'
import './styles.css'

export function App() {
  return (
    <main>
      <a href="#background">Background link</a>
      <Dialog
        title="Edit profile"
        description="Update your public information."
        triggerLabel="Edit profile"
      >
        <label>
          Name
          <input name="name" defaultValue="Ada" />
        </label>
        <Dialog
          title="Permissions"
          description="Choose who can see this profile."
          triggerLabel="Open permissions"
        >
          <button type="button">Save permissions</button>
        </Dialog>
      </Dialog>
    </main>
  )
}
