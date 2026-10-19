import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

import { featureFlags } from '../packages/plugin/dist/index.js'
import { build } from 'vite'

const root = fileURLToPath(new URL('../examples/consumer/', import.meta.url))
const source = fileURLToPath(new URL('../examples/consumer/flags.json', import.meta.url))

await assert.rejects(
  build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [featureFlags({ source, expose: ['missingFlag'] })],
    build: { write: false },
  }),
  (error) => {
    const message = error instanceof Error ? error.message : String(error)
    return message.includes('missingFlag') && message.includes('flags.json')
  },
)
