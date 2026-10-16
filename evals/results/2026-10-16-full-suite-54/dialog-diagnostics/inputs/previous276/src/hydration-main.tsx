import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

import { HydrationApp } from './HydrationApp'
import './styles.css'

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <HydrationApp />
  </StrictMode>,
)
