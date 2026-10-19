import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { featureFlags } from '../packages/plugin/dist/index.js'

test('validates configuration before Vite starts', () => {
  assert.throws(
    () => featureFlags({ source: new URL('https://example.com/flags.json'), expose: [] }),
    /file: protocol/,
  )
  assert.throws(
    () => featureFlags({ source: 'flags.json', expose: ['theme', 'theme'] }),
    /duplicate flag "theme"/,
  )
})

test('reports malformed sources without including their contents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-test-'))
  const source = join(directory, 'flags.json')
  const secret = 'private-value-that-must-not-be-diagnosed'

  try {
    await writeFile(source, `{ "token": "${secret}"`)
    const plugin = featureFlags({ source, expose: ['token'] })
    const resolvedId = plugin.resolveId.call({}, 'virtual:feature-flags')

    await assert.rejects(
      plugin.load.call({ addWatchFile() {} }, resolvedId),
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        return message.includes('invalid JSON') && !message.includes(secret)
      },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('serializes only exposed JSON values', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-test-'))
  const source = join(directory, 'flags.json')

  try {
    await writeFile(
      source,
      JSON.stringify({ publicConfig: { colors: ['red', null] }, privateToken: 'secret' }),
    )
    const plugin = featureFlags({ source, expose: ['publicConfig'] })
    const resolvedId = plugin.resolveId.call({}, 'virtual:feature-flags')
    const moduleCode = await plugin.load.call({ addWatchFile() {} }, resolvedId)

    assert.match(moduleCode, /publicConfig/)
    assert.doesNotMatch(moduleCode, /privateToken|secret/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
