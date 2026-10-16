import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../examples/consumer/dist/', import.meta.url))
const assets = await readdir(new URL('assets/', `file://${dist}/`))
const scripts = await Promise.all(
  assets.filter((name) => name.endsWith('.js')).map((name) => readFile(`${dist}/assets/${name}`, 'utf8')),
)
const bundle = scripts.join('\n')
const sourceMaps = await Promise.all(
  assets.filter((name) => name.endsWith('.map')).map((name) => readFile(`${dist}/assets/${name}`, 'utf8')),
)
const clientArtifacts = [...scripts, ...sourceMaps].join('\n')

assert.match(bundle, /checkoutV2/)
assert.doesNotMatch(clientArtifacts, /server-token-for-eval/)
