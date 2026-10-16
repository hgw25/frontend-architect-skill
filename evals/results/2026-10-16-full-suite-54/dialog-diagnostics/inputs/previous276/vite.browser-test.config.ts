import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/browser-test-main.tsx',
      fileName: 'fixture',
      formats: ['iife'],
      name: 'DialogBrowserFixture',
    },
    outDir: 'dist/browser-test',
  },
})
