import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { featureFlags } from '../packages/plugin/dist/index.js'
import { createServer } from 'vite'

const root = fileURLToPath(new URL('../examples/consumer/', import.meta.url))
const source = fileURLToPath(new URL('../examples/consumer/flags.json', import.meta.url))
const original = await readFile(source, 'utf8')
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'silent',
  server: { middlewareMode: true },
  plugins: [featureFlags({ source, expose: ['checkoutV2', 'theme'] })],
})

try {
  const first = await server.ssrLoadModule('/src/flags.ts')
  assert.deepEqual(first.flags, { checkoutV2: true, theme: 'dark' })

  const changed = JSON.stringify({
    checkoutV2: false,
    theme: 'light',
    SERVER_TOKEN: 'server-token-for-eval',
  })
  const directory = fileURLToPath(new URL('.', new URL('../examples/consumer/flags.json', import.meta.url)))
  const watchDeadline = Date.now() + 3000
  while (!(server.watcher.getWatched()[directory.replace(/\/$/, '')] || []).includes('flags.json')) {
    if (Date.now() > watchDeadline) throw new Error('Source was not registered with Vite watcher')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  let timer
  const changeSeen = new Promise((resolve,reject) => {
    timer=setTimeout(()=>reject(new Error('Source change was not observed')),3000)
    server.watcher.once('change',()=>{clearTimeout(timer);resolve()})
  })
  await writeFile(source, changed)
  await changeSeen

  const deadline = Date.now() + 2_000
  let updated
  do {
    updated = await server.ssrLoadModule('/src/flags.ts')
    if (updated.flags.checkoutV2 === false) break
    await new Promise((resolve) => setTimeout(resolve, 25))
  } while (Date.now() < deadline)

  assert.deepEqual(updated.flags, { checkoutV2: false, theme: 'light' })
  assert.doesNotMatch(JSON.stringify(updated.flags), /server-token-for-eval/)
} finally {
  await writeFile(source, original)
  await server.close()
}
