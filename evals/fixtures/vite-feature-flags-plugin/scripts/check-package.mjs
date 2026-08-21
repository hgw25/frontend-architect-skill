import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const { stdout } = await run('npm', [
  'pack',
  '--dry-run',
  '--json',
  '--workspace',
  '@frontend-architect-eval/feature-flags',
])
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
