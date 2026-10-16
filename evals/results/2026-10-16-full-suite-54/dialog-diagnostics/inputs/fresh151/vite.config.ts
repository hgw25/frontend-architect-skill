import react from '@vitejs/plugin-react'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { defineConfig } from 'vite'

import { App } from './src/App'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dialog-fixture-ssr',
      transformIndexHtml(html) {
        const appHtml = renderToString(createElement(App))
        return html.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)
      },
    },
  ],
})
