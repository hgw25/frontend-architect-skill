import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = fileURLToPath(new URL('../', import.meta.url))
const consumer = await mkdtemp(join(tmpdir(), 'frontend-architect-packed-consumer-'))

try {
  const { stdout } = await run('npm', [
    'pack', '--json', '--workspace', '@frontend-architect-eval/feature-flags',
    '--pack-destination', consumer,
  ], { cwd: root })
  const [packed] = JSON.parse(stdout)
  const files = new Set(packed.files.map(({ path }) => path))
  for (const expected of ['dist/index.js', 'dist/index.js.map', 'dist/index.d.ts', 'dist/virtual.d.ts']) {
    assert.ok(files.has(expected), `packed package is missing ${expected}`)
  }
  const { devDependencies } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }))
  await run('npm', [
    'install', '--ignore-scripts', '--no-audit', '--no-fund', join(consumer, packed.filename),
    `vite@${devDependencies.vite}`, `typescript@${devDependencies.typescript}`,
    `@types/node@${devDependencies['@types/node']}`,
  ], { cwd: consumer })
  await mkdir(join(consumer, 'src'))
  await writeFile(join(consumer, 'src/flags.ts'), "export { flags } from 'virtual:feature-flags'\n")
  await writeFile(join(consumer, 'consumer.ts'), `
import { featureFlags } from '@frontend-architect-eval/feature-flags'
import { flags } from 'virtual:feature-flags'
import type { Plugin } from 'vite'
const plugin: Plugin = featureFlags({ source: new URL('./flags.json', import.meta.url), expose: ['checkoutV2'] })
type PublishedValue = typeof flags[string]
const nested: PublishedValue = { nested: [false, null, 3] }
// @ts-expect-error source is a filesystem path or file URL
featureFlags({ source: 42, expose: [] })
// @ts-expect-error exposed names are strings
featureFlags({ source: './flags.json', expose: [42] })
// @ts-expect-error JSON values do not include functions
const invalid: PublishedValue = () => true
void [plugin, nested, invalid]
`)
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler',
      strict: true, noEmit: true, skipLibCheck: true,
      types: ['node', '@frontend-architect-eval/feature-flags/virtual'] },
    include: ['consumer.ts', 'src/**/*.ts'],
  }))
  await run(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { cwd: consumer })
  await writeFile(join(consumer, 'verify.mjs'), `
import assert from 'node:assert/strict'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { featureFlags } from '@frontend-architect-eval/feature-flags'
import { build, createServer } from 'vite'
const root = process.cwd()
const source = join(root, 'flags.json')
const exposed = { checkoutV2: true, metadata: { nested: [false, null, 3] } }
const privateValue = 'packed-consumer-private-token'
await writeFile(source, JSON.stringify({ ...exposed, SERVER_TOKEN: privateValue }))
const options = () => ({ source: pathToFileURL(source), expose: Object.keys(exposed) })
await build({ root, configFile: false, logLevel: 'silent', plugins: [featureFlags(options())],
  build: { sourcemap: true, minify: false, lib: { entry: 'src/flags.ts', formats: ['es'], fileName: 'flags' } } })
const built = await import(pathToFileURL(join(root, 'dist/flags.js')))
assert.deepEqual(built.flags, exposed)
const artifacts = await Promise.all((await readdir(join(root, 'dist'))).map(name => readFile(join(root, 'dist', name), 'utf8')))
assert.ok(!artifacts.join('\\n').includes(privateValue), 'secret leaked through packed consumer build or source map')
const server = await createServer({ root, configFile: false, logLevel: 'silent',
  server: { middlewareMode: true }, plugins: [featureFlags(options())] })
try {
  assert.deepEqual((await server.ssrLoadModule('/src/flags.ts')).flags, exposed)
  const next = { ...exposed, checkoutV2: false }
  const watchDeadline = Date.now() + 3000
  while (!(server.watcher.getWatched()[root] || []).includes('flags.json')) {
    assert.ok(Date.now() < watchDeadline, 'packed plugin did not watch its configured source')
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  await writeFile(source, JSON.stringify({ ...next, SERVER_TOKEN: privateValue }))
  const deadline = Date.now() + 3000
  let actual
  do {
    actual = (await server.ssrLoadModule('/src/flags.ts')).flags
    if (actual.checkoutV2 === false) break
    await new Promise(resolve => setTimeout(resolve, 20))
  } while (Date.now() < deadline)
  assert.deepEqual(actual, next, 'packed development consumer did not receive changed flags')
} finally {
  await server.close()
}
await assert.rejects(build({ root, configFile: false, logLevel: 'silent',
  plugins: [featureFlags({ ...options(), expose: ['missingFlag'] })],
  build: { write: false, lib: { entry: 'src/flags.ts', formats: ['es'] } } }),
  error => error.message.includes('missingFlag') && error.message.includes('flags.json'))
console.log('PACKED_CONSUMER_OK: public types, production values/maps, development updates, diagnostics')
`)
  const result = await run(process.execPath, ['verify.mjs'], { cwd: consumer })
  process.stdout.write(result.stdout)
} finally {
  await rm(consumer, { recursive: true, force: true })
}
