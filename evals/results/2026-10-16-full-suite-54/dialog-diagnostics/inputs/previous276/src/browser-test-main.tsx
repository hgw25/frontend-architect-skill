import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'

import { App } from './App'
import { HydrationApp } from './HydrationApp'

const root = document.getElementById('root')!

if (document.documentElement.dataset.fixture === 'hydration') {
  hydrateRoot(
    root,
    <StrictMode>
      <HydrationApp />
    </StrictMode>,
  )
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
