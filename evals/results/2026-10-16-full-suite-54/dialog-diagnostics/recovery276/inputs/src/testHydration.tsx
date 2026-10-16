import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'

import { App } from './App'

export function hydrateTestApp(root: HTMLElement) {
  const app = (
    <StrictMode>
      <App />
    </StrictMode>
  )

  root.innerHTML = renderToString(app)
  hydrateRoot(root, app)
}
