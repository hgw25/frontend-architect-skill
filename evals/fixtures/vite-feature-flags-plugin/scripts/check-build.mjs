import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../examples/consumer/dist/', import.meta.url))
const assets = await readdir(new URL('assets/', `file://${dist}/`))
const scripts = await Promise.all(
  assets.filter((name) => name.endsWith('.js')).map((name) => readFile(`${dist}/assets/${name}`, 'utf8')),
)
const bundle = scripts.join('\n')

assert.match(bundle, /checkoutV2/)
assert.doesNotMatch(bundle, /server-token-for-eval/)
