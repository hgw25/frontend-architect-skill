import { watch, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

export type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export interface FeatureFlagsOptions {
  /** JSON file containing all flags. Relative paths use Vite's configured root. */
  source: string | URL
  /** Flag names that may be embedded in client modules. */
  expose: readonly string[]
}

const publicModuleId = 'virtual:feature-flags'
const resolvedModuleId = `\0${publicModuleId}`
const diagnosticPrefix = '[feature-flags]'

interface ValidatedOptions {
  readonly source: string | URL
  readonly expose: readonly string[]
}

export function featureFlags(options: FeatureFlagsOptions): Plugin {
  const validatedOptions = validateOptions(options)
  let sourcePath: string | undefined
  let nativeWatcher: FSWatcher | undefined
  let pendingNativeChange: NodeJS.Timeout | undefined
  let removeViteChangeListener: (() => void) | undefined

  const closeNativeWatcher = () => {
    if (pendingNativeChange) clearTimeout(pendingNativeChange)
    pendingNativeChange = undefined
    removeViteChangeListener?.()
    removeViteChangeListener = undefined
    nativeWatcher?.close()
    nativeWatcher = undefined
  }

  return {
    name: 'feature-flags',

    configResolved(config: ResolvedConfig) {
      sourcePath = resolveSourcePath(validatedOptions.source, config.root)
    },

    configureServer(server: ViteDevServer) {
      if (!sourcePath) {
        throw new Error(`${diagnosticPrefix} Vite configuration was not resolved before server setup`)
      }
      if (server.config.server.watch === null) return

      server.watcher.add(sourcePath)
      const watchedSource = sourcePath
      const onViteChange = (changedPath: string) => {
        if (changedPath !== watchedSource || !pendingNativeChange) return
        clearTimeout(pendingNativeChange)
        pendingNativeChange = undefined
      }
      server.watcher.on('change', onViteChange)
      removeViteChangeListener = () => server.watcher.off('change', onViteChange)

      try {
        nativeWatcher = watch(watchedSource, { persistent: false }, () => {
          if (pendingNativeChange) clearTimeout(pendingNativeChange)
          pendingNativeChange = setTimeout(() => {
            pendingNativeChange = undefined
            server.watcher.emit('change', watchedSource)
          }, 25)
        })
      } catch (error) {
        closeNativeWatcher()
        throw diagnosticError(`cannot watch source ${JSON.stringify(watchedSource)}`, error)
      }

      nativeWatcher.on('error', (error) => {
        server.config.logger.warn(
          diagnosticError(`stopped watching source ${JSON.stringify(watchedSource)}`, error).message,
        )
      })
    },

    resolveId(id: string) {
      if (id === publicModuleId) return resolvedModuleId
      return null
    },

    async load(id: string) {
      if (id !== resolvedModuleId) return null
      if (!sourcePath) {
        throw new Error(`${diagnosticPrefix} Vite configuration was not resolved before loading flags`)
      }

      this.addWatchFile(sourcePath)
      const flags = await loadFlags(sourcePath, validatedOptions.expose)

      const serializedFlags = JSON.stringify(flags)
      return `export const flags = JSON.parse(${JSON.stringify(serializedFlags)});\n`
    },

    closeBundle() {
      closeNativeWatcher()
    },
  }
}

function validateOptions(options: FeatureFlagsOptions): ValidatedOptions {
  const candidate: unknown = options
  if (!candidate || typeof candidate !== 'object') {
    throw new TypeError(`${diagnosticPrefix} options must be an object`)
  }

  const { source, expose } = candidate as Partial<FeatureFlagsOptions>
  if (!(source instanceof URL) && (typeof source !== 'string' || source.length === 0)) {
    throw new TypeError(`${diagnosticPrefix} "source" must be a non-empty path or file URL`)
  }
  if (!Array.isArray(expose) || !expose.every((key) => typeof key === 'string')) {
    throw new TypeError(`${diagnosticPrefix} "expose" must be an array of flag names`)
  }

  const uniqueKeys = new Set(expose)
  if (uniqueKeys.size !== expose.length) {
    throw new TypeError(`${diagnosticPrefix} "expose" must not contain duplicate flag names`)
  }

  return { source, expose: [...expose] }
}

function resolveSourcePath(source: string | URL, root: string): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new TypeError(`${diagnosticPrefix} "source" URL must use the file: protocol`)
    }
    return fileURLToPath(source)
  }

  return isAbsolute(source) ? source : resolve(root, source)
}

async function loadFlags(
  sourcePath: string,
  exposedKeys: readonly string[],
): Promise<Record<string, JsonValue>> {
  let contents: string
  try {
    contents = await readFile(sourcePath, 'utf8')
  } catch (error) {
    throw diagnosticError(`cannot read source ${JSON.stringify(sourcePath)}`, error)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw diagnosticError(`invalid JSON in source ${JSON.stringify(sourcePath)}`, error)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError(
      `${diagnosticPrefix} source ${JSON.stringify(sourcePath)} must contain a JSON object`,
    )
  }

  const sourceFlags = parsed as Record<string, JsonValue>
  const exposedFlags: Record<string, JsonValue> = Object.create(null) as Record<
    string,
    JsonValue
  >
  for (const key of exposedKeys) {
    if (!Object.prototype.hasOwnProperty.call(sourceFlags, key)) {
      throw new Error(
        `${diagnosticPrefix} exposed flag ${JSON.stringify(key)} is missing from source ${JSON.stringify(sourcePath)}`,
      )
    }
    exposedFlags[key] = sourceFlags[key] as JsonValue
  }

  return exposedFlags
}

function diagnosticError(message: string, cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause)
  return new Error(`${diagnosticPrefix} ${message}: ${detail}`, { cause })
}
