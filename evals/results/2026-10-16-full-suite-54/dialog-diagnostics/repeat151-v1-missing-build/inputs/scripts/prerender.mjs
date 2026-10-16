import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import { App } from '../dist/ssr/App.js'

const outputPath = resolve(import.meta.dirname, '../dist/demo/index.html')
const template = await readFile(outputPath, 'utf8')
const markup = renderToString(createElement(StrictMode, null, createElement(App)))
const html = template.replace(
  '<div id="root"></div>',
  `<div id="root" data-ssr="true">${markup}</div>`,
)

await writeFile(outputPath, html)
