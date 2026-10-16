import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist/package',
    rollupOptions: {
      external: (id) => id === 'react' || id.startsWith('react/') || id === 'react-dom' || id.startsWith('react-dom/'),
    },
  },
})
