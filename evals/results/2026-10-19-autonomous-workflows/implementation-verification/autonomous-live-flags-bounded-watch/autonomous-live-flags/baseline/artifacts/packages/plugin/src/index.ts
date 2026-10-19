import { unwatchFile, watchFile } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin, ResolvedConfig } from 'vite'

export interface FeatureFlagsOptions {
  /** JSON file containing the complete set of feature flags. */
  source: string | URL
  /** Names which may be embedded in browser code. */
  expose: readonly string[]
}

const PUBLIC_ID = 'virtual:feature-flags'
const RESOLVED_ID = `\0${PUBLIC_ID}`

/**
 * Exposes an explicit, client-safe subset of a JSON feature flag file through
 * `virtual:feature-flags`.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  assertOptions(options)

  let sourcePath: string | undefined
  let stopSourceWatcher: (() => void) | undefined

  const getSourcePath = (): string => {
    if (sourcePath === undefined) {
      throw new Error('[feature-flags] Vite configuration has not been resolved')
    }

    return sourcePath
  }

  return {
    name: 'feature-flags',

    configResolved(config: ResolvedConfig) {
      sourcePath = resolveSource(options.source, config)
    },

    buildStart() {
      this.addWatchFile(getSourcePath())
    },

    configureServer(server) {
      // The virtual module may not have been requested yet when a tool starts
      // watching. Register the source eagerly so changes are never missed.
      const file = getSourcePath()
      server.watcher.add(file)
      stopSourceWatcher?.()
      const onSourceChange = () => {
        for (const environment of Object.values(server.environments)) {
          const module = environment.moduleGraph.getModuleById(RESOLVED_ID)
          if (module !== undefined) {
            environment.moduleGraph.invalidateModule(module)
          }
        }

        server.hot.send({ type: 'full-reload', path: '*' })
        // Mirror the promptly detected change through Vite's watcher as well,
        // so its normal watchChange hooks and integrations observe the source.
        server.watcher.emit('change', file)
      }
      watchFile(file, { persistent: false, interval: 50 }, onSourceChange)
      stopSourceWatcher = () => unwatchFile(file, onSourceChange)
      server.watcher.once('close', () => {
        stopSourceWatcher?.()
        stopSourceWatcher = undefined
      })
    },

    resolveId(id) {
      if (id === PUBLIC_ID) {
        return RESOLVED_ID
      }

      return null
    },

    async load(id) {
      if (id !== RESOLVED_ID) {
        return null
      }

      const file = getSourcePath()
      this.addWatchFile(file)

      try {
        const flags = await readPublicFlags(file, options.expose)
        return createVirtualModule(flags)
      } catch (error) {
        this.error(formatError(error, file))
      }
    },

    hotUpdate({ file }) {
      if (resolve(file) !== getSourcePath()) {
        return
      }

      // configureServer has already invalidated all environment-specific
      // module graphs and sent the single update notification.
      return []
    },
  }
}

function assertOptions(options: FeatureFlagsOptions): void {
  if (options === null || typeof options !== 'object') {
    throw new TypeError('[feature-flags] Expected an options object')
  }

  if (!(typeof options.source === 'string' || options.source instanceof URL)) {
    throw new TypeError('[feature-flags] "source" must be a filesystem path or file URL')
  }

  if (!Array.isArray(options.expose) || options.expose.some((key) => typeof key !== 'string')) {
    throw new TypeError('[feature-flags] "expose" must be an array of flag names')
  }
}

function resolveSource(source: string | URL, config: ResolvedConfig): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new TypeError(`[feature-flags] "source" URL must use the file: protocol (received ${source.href})`)
    }

    return resolve(fileURLToPath(source))
  }

  return isAbsolute(source) ? resolve(source) : resolve(config.root, source)
}

async function readPublicFlags(
  source: string,
  exposedNames: readonly string[],
): Promise<Record<string, unknown>> {
  const contents = await readFile(source, 'utf8')
  const parsed: unknown = JSON.parse(contents)

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError('Expected the JSON root to be an object')
  }

  const allFlags = parsed as Record<string, unknown>
  const entries = exposedNames.map((name) => {
    if (!Object.hasOwn(allFlags, name)) {
      throw new Error(`Exposed flag "${name}" is missing`)
    }

    return [name, allFlags[name]] as const
  })

  return Object.fromEntries(entries)
}

function createVirtualModule(flags: Record<string, unknown>): string {
  // Escaping these separators also keeps the output valid for older JS parsers.
  const serialized = JSON.stringify(flags)
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')

  return `export const flags = Object.freeze(${serialized});\n`
}

function formatError(error: unknown, source: string): string {
  const detail = error instanceof Error ? error.message : String(error)
  return `[feature-flags] Could not load ${source}: ${detail}`
}
