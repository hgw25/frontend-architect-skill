import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

import { featureFlags } from '../dist/index.js'

const resolvedModuleId = '\0virtual:feature-flags'

test('preserves JSON property names while exposing only allowed flags', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-plugin-test-'))
  context.after(() => rm(directory, { recursive: true, force: true }))

  const source = join(directory, 'flags.json')
  await writeFile(
    source,
    '{"__proto__":"literal","nested":{"enabled":true},"secret":"hidden"}',
  )

  const plugin = featureFlags({
    source: pathToFileURL(source),
    expose: ['__proto__', 'nested'],
  })
  const watched = []
  const loaded = await plugin.load.call(
    { addWatchFile(file) { watched.push(file) } },
    resolvedModuleId,
  )
  assert.equal(typeof loaded, 'object')

  const module = await import(`data:text/javascript,${encodeURIComponent(loaded.code)}`)
  assert.deepEqual(
    module.flags,
    JSON.parse('{"__proto__":"literal","nested":{"enabled":true}}'),
  )
  assert.equal(Object.hasOwn(module.flags, '__proto__'), true)
  assert.doesNotMatch(loaded.code, /hidden|secret/)
  assert.deepEqual(watched, [source])
})

test('resolves relative sources from the Vite project root', async (context) => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-plugin-test-'))
  context.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(join(directory, 'flags.json'), JSON.stringify({ enabled: true }))

  const plugin = featureFlags({ source: 'flags.json', expose: ['enabled'] })
  plugin.configResolved({ root: directory })
  const loaded = await plugin.load.call({ addWatchFile() {} }, resolvedModuleId)

  assert.match(loaded.code, /enabled/)
})

test('rejects non-file URLs before Vite starts', () => {
  assert.throws(
    () => featureFlags({ source: new URL('https://example.com/flags.json'), expose: [] }),
    /local file URL.*https:/,
  )
})
