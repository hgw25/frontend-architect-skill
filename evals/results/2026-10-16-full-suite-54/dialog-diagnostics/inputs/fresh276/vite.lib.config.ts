import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/],
      output: {
        banner: "'use client';",
      },
    },
    outDir: 'dist',
  },
})
