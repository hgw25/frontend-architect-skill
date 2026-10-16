import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        hydration: resolve(import.meta.dirname, 'hydration.html'),
        main: resolve(import.meta.dirname, 'index.html'),
      },
    },
  },
  plugins: [react()],
})
