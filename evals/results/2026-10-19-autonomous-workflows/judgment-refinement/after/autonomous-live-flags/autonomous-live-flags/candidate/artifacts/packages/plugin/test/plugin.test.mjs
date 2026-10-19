import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { featureFlags } from '../dist/index.js'
import { build } from 'vite'

test('validates plugin configuration before Vite starts', () => {
  assert.throws(
    () => featureFlags({ source: new URL('https://example.com/flags.json'), expose: [] }),
    /must be a file URL.*https:/,
  )
  assert.throws(
    () => featureFlags({ source: 'flags.json', expose: [1] }),
    /"expose" must be an array of flag names/,
  )
})

test('emits every JSON value type while excluding private source data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-plugin-'))
  const source = join(directory, 'flags.json')

  try {
    await writeFile(
      source,
      JSON.stringify({
        enabled: true,
        settings: { retries: 2, labels: ['new', null] },
        ['__proto__']: 'ordinary-json-key',
        PRIVATE_TOKEN: 'must-not-ship',
      }),
    )

    const result = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [
        featureFlags({ source, expose: ['enabled', 'settings', '__proto__'] }),
      ],
      build: {
        write: false,
        sourcemap: true,
        rollupOptions: { input: 'virtual:feature-flags' },
      },
    })
    const outputs = Array.isArray(result) ? result : [result]
    const artifacts = outputs.flatMap(({ output }) => output)
    const clientText = artifacts
      .map((artifact) =>
        artifact.type === 'chunk'
          ? `${artifact.code}\n${JSON.stringify(artifact.map)}`
          : '',
      )
      .join('\n')

    assert.match(clientText, /enabled/)
    assert.match(clientText, /retries/)
    assert.match(clientText, /ordinary-json-key/)
    assert.doesNotMatch(clientText, /must-not-ship/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('reports invalid sources without echoing their contents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'feature-flags-plugin-'))
  const source = join(directory, 'flags.json')

  try {
    await writeFile(source, '[]')
    await assert.rejects(
      build({
        configFile: false,
        logLevel: 'silent',
        plugins: [featureFlags({ source, expose: [] })],
        build: {
          write: false,
          rollupOptions: { input: 'virtual:feature-flags' },
        },
      }),
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        return message.includes('flags.json') && message.includes('JSON object')
      },
    )

    await writeFile(source, '{"PRIVATE_TOKEN":"must-not-appear"')
    await assert.rejects(
      build({
        configFile: false,
        logLevel: 'silent',
        plugins: [featureFlags({ source, expose: [] })],
        build: {
          write: false,
          rollupOptions: { input: 'virtual:feature-flags' },
        },
      }),
      (error) => {
        const message = error instanceof Error ? error.message : String(error)
        return (
          message.includes('flags.json') &&
          message.includes('not valid JSON') &&
          !message.includes('must-not-appear')
        )
      },
    )
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
