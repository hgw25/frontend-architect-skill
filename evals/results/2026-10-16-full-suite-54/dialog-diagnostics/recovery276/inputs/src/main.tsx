import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './App'

const root = document.getElementById('root')!

if (new URLSearchParams(window.location.search).has('hydrate')) {
  void import('./testHydration').then(({ hydrateTestApp }) => hydrateTestApp(root))
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
