import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

import { Dialog } from './index'

hydrateRoot(
  document.getElementById('hydration-root')!,
  <StrictMode>
    <Dialog.Root defaultOpen>
      <Dialog.Trigger>Open by default</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content aria-label="Hydrated dialog" />
      </Dialog.Portal>
    </Dialog.Root>
  </StrictMode>,
)
