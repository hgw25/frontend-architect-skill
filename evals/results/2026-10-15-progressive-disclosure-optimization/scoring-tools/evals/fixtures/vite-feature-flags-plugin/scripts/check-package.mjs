import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const temporaryConsumer = await mkdtemp(
  join(tmpdir(), 'frontend-architect-packed-consumer-'),
)

try {
  const { stdout } = await run(
    'npm',
    [
      'pack',
      '--json',
      '--workspace',
      '@frontend-architect-eval/feature-flags',
      '--pack-destination',
      temporaryConsumer,
    ],
    { cwd: root },
  )
  const [manifest] = JSON.parse(stdout)
  const files = new Set(manifest.files.map(({ path }) => path))

  for (const expected of [
    'dist/index.js',
    'dist/index.js.map',
    'dist/index.d.ts',
    'dist/virtual.d.ts',
  ]) {
    assert.ok(files.has(expected), `packed package is missing ${expected}`)
  }

  const vitePackage = JSON.parse(
    await readFile(join(root, 'node_modules/vite/package.json'), 'utf8'),
  )
  await writeFile(
    join(temporaryConsumer, 'package.json'),
    JSON.stringify({ private: true, type: 'module' }),
  )
  await run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(temporaryConsumer, manifest.filename),
      `vite@${vitePackage.version}`,
    ],
    { cwd: temporaryConsumer },
  )
  await writeFile(
    join(temporaryConsumer, 'verify.mjs'),
    [
      "import assert from 'node:assert/strict'",
      "import { featureFlags } from '@frontend-architect-eval/feature-flags'",
      "const plugin = featureFlags({ source: new URL('./flags.json', import.meta.url), expose: ['checkoutV2'] })",
      "assert.equal(typeof plugin, 'object')",
      "assert.equal(typeof plugin.resolveId, 'function')",
      "assert.equal(typeof plugin.load, 'function')",
    ].join('\n'),
  )
  await run(process.execPath, ['verify.mjs'], { cwd: temporaryConsumer })
} finally {
  await rm(temporaryConsumer, { recursive: true, force: true })
}
