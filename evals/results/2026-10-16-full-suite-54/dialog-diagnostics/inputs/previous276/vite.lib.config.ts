import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/index.ts',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist/package',
    rollupOptions: {
      external: (id) => /^react(?:\/|$)/.test(id) || /^react-dom(?:\/|$)/.test(id),
    },
  },
})
