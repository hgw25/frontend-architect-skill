import { watch, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import { normalizePath, type Plugin } from 'vite'

const PUBLIC_MODULE_ID = 'virtual:feature-flags'
const RESOLVED_MODULE_ID = `\0${PUBLIC_MODULE_ID}`

export type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface FeatureFlagsOptions {
  /** A filesystem path or file URL to a JSON object. */
  source: string | URL
  /** The only source keys that may be embedded in client modules. */
  expose: readonly string[]
}

interface NormalizedOptions {
  sourcePath: string
  expose: readonly string[]
}

export function featureFlags(options: FeatureFlagsOptions): Plugin {
  const { sourcePath, expose } = normalizeOptions(options)
  let sourceWatcher: FSWatcher | undefined
  let pendingChange: NodeJS.Timeout | undefined

  return {
    name: 'feature-flags',

    configureServer(server) {
      sourceWatcher?.close()
      try {
        sourceWatcher = watch(sourcePath, { persistent: false }, () => {
          if (pendingChange) return

          pendingChange = setTimeout(() => {
            pendingChange = undefined
            server.watcher.emit('change', sourcePath)
          }, 10)
        })
      } catch (error) {
        throw sourceOperationError('watch', sourcePath, error)
      }

      sourceWatcher.on('error', (error) => {
        const diagnostic = sourceOperationError('watch', sourcePath, error)
        server.config.logger.error(diagnostic.message)
      })
    },

    resolveId(id) {
      if (id === PUBLIC_MODULE_ID) return RESOLVED_MODULE_ID
    },

    async load(id) {
      if (id !== RESOLVED_MODULE_ID) return

      this.addWatchFile(sourcePath)
      const flags = await loadFlags(sourcePath, expose)

      return `export const flags = Object.freeze(${JSON.stringify(flags)});\n`
    },

    handleHotUpdate({ file, modules, server }) {
      if (normalizePath(resolve(file)) !== sourcePath) return

      const affectedModules = new Set(modules)
      const virtualModule = server.moduleGraph.getModuleById(RESOLVED_MODULE_ID)

      if (virtualModule) {
        server.moduleGraph.invalidateModule(virtualModule)
        affectedModules.add(virtualModule)
      }

      return [...affectedModules]
    },

    closeBundle() {
      sourceWatcher?.close()
      sourceWatcher = undefined
      if (pendingChange) clearTimeout(pendingChange)
      pendingChange = undefined
    },
  }
}

function normalizeOptions(options: FeatureFlagsOptions): NormalizedOptions {
  if (!options || typeof options !== 'object') {
    throw configurationError('expected an options object with source and expose')
  }

  const { source, expose } = options
  const sourcePath = resolveSource(source)

  if (!Array.isArray(expose)) {
    throw configurationError('"expose" must be an array of flag names')
  }

  const seen = new Set<string>()
  for (const key of expose) {
    if (typeof key !== 'string' || key.length === 0) {
      throw configurationError('every "expose" entry must be a non-empty string')
    }
    if (seen.has(key)) {
      throw configurationError(`"expose" contains the duplicate flag "${key}"`)
    }
    seen.add(key)
  }

  return { sourcePath, expose: [...expose] }
}

function resolveSource(source: FeatureFlagsOptions['source']): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw configurationError('"source" URLs must use the file: protocol')
    }
    return normalizePath(fileURLToPath(source))
  }

  if (typeof source !== 'string' || source.length === 0) {
    throw configurationError('"source" must be a non-empty filesystem path or file URL')
  }

  return normalizePath(resolve(source))
}

async function loadFlags(
  sourcePath: string,
  expose: readonly string[],
): Promise<Record<string, JsonValue>> {
  let contents: string
  try {
    contents = await readFile(sourcePath, 'utf8')
  } catch (error) {
    throw sourceOperationError('read', sourcePath, error)
  }

  let value: unknown
  try {
    value = JSON.parse(contents)
  } catch {
    throw new Error(
      `[feature-flags] Feature flag source "${sourcePath}" contains invalid JSON.`,
    )
  }

  if (!isJsonObject(value)) {
    throw new Error(
      `[feature-flags] Feature flag source "${sourcePath}" must contain a JSON object.`,
    )
  }

  const exposedEntries = expose.map((key): [string, JsonValue] => {
    const flag = value[key]
    if (!Object.hasOwn(value, key) || flag === undefined) {
      throw new Error(
        `[feature-flags] Exposed flag "${key}" is missing from "${sourcePath}".`,
      )
    }
    return [key, flag]
  })

  return Object.fromEntries(exposedEntries)
}

function isJsonObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return
  return typeof error.code === 'string' ? error.code : undefined
}

function configurationError(message: string): TypeError {
  return new TypeError(`[feature-flags] Invalid configuration: ${message}.`)
}

function sourceOperationError(
  operation: 'read' | 'watch',
  sourcePath: string,
  error: unknown,
): Error {
  const code = getErrorCode(error)
  const suffix = code ? ` (${code})` : ''
  return new Error(
    `[feature-flags] Could not ${operation} feature flag source "${sourcePath}"${suffix}.`,
  )
}
