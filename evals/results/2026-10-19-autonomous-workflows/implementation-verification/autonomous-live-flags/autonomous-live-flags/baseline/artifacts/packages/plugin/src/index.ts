import { watch, type FSWatcher } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

const PUBLIC_MODULE_ID = 'virtual:feature-flags'
const RESOLVED_MODULE_ID = `\0${PUBLIC_MODULE_ID}`

export type JsonPrimitive = boolean | number | string | null
export type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[]

export interface FeatureFlagsOptions {
  /** A path (relative to Vite's project root) or a file URL to a JSON object. */
  source: string | URL
  /** The only keys that may be included in browser code. */
  expose: readonly string[]
}

/**
 * Exposes an explicit, client-safe subset of a JSON feature flag file through
 * `virtual:feature-flags`.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  assertOptions(options)

  let sourceFile: string | undefined
  let sourceWatcher: FSWatcher | undefined

  const resolveSource = (config?: ResolvedConfig): string => {
    if (sourceFile !== undefined) return sourceFile

    if (options.source instanceof URL) {
      if (options.source.protocol !== 'file:') {
        throw new TypeError(
          `[feature-flags] source URL must use the file: protocol; received ${options.source.protocol}`,
        )
      }
      sourceFile = path.normalize(fileURLToPath(options.source))
    } else {
      const root = config?.root ?? process.cwd()
      sourceFile = path.resolve(root, options.source)
    }

    return sourceFile
  }

  return {
    name: 'feature-flags',

    configResolved(config) {
      resolveSource(config)
    },

    configureServer(server) {
      const filename = resolveSource()
      server.watcher.add(filename)

      // Register synchronously so an edit immediately after server startup is
      // not lost while Vite's recursive watcher is still discovering files.
      try {
        const watcher = watch(filename, { persistent: false }, () => {
          server.watcher.emit('change', filename)
        })
        watcher.on('error', () => watcher.close())
        sourceWatcher = watcher
        server.httpServer?.once('close', () => watcher.close())
      } catch {
        // readFlags reports missing or inaccessible sources with useful context.
      }
    },

    resolveId(id) {
      if (id === PUBLIC_MODULE_ID) return RESOLVED_MODULE_ID
      return null
    },

    async load(id) {
      if (id !== RESOLVED_MODULE_ID) return null

      const filename = resolveSource()
      this.addWatchFile(filename)
      const flags = await readFlags(filename, options.expose)

      return `export const flags = Object.freeze(${JSON.stringify(flags)});\n`
    },

    handleHotUpdate({ file, server }) {
      if (path.resolve(file) !== resolveSource()) return

      invalidateVirtualModule(server)
      return []
    },

    closeBundle() {
      sourceWatcher?.close()
      sourceWatcher = undefined
    },
  }
}

function invalidateVirtualModule(server: ViteDevServer): void {
  const module = server.moduleGraph.getModuleById(RESOLVED_MODULE_ID)
  if (module !== undefined) server.moduleGraph.invalidateModule(module)

  // Flags are configuration rather than application source. A full reload
  // makes the new snapshot visible even when no importer accepts HMR.
  server.ws.send({ type: 'full-reload', path: '*' })
}

function assertOptions(options: FeatureFlagsOptions): void {
  if (typeof options !== 'object' || options === null) {
    throw new TypeError('[feature-flags] options must be an object')
  }
  if (typeof options.source !== 'string' && !(options.source instanceof URL)) {
    throw new TypeError('[feature-flags] source must be a filesystem path or file URL')
  }
  if (typeof options.source === 'string' && options.source.length === 0) {
    throw new TypeError('[feature-flags] source must not be empty')
  }
  if (!Array.isArray(options.expose) || options.expose.some((key) => typeof key !== 'string')) {
    throw new TypeError('[feature-flags] expose must be an array of flag names')
  }
}

async function readFlags(
  filename: string,
  exposedNames: readonly string[],
): Promise<Record<string, JsonValue>> {
  let contents: string
  try {
    contents = await readFile(filename, 'utf8')
  } catch (error) {
    throw new Error(`[feature-flags] Unable to read source file ${filename}`, { cause: error })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(`[feature-flags] Invalid JSON in source file ${filename}`, { cause: error })
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`[feature-flags] Source file ${filename} must contain a JSON object`)
  }

  const sourceFlags = parsed as Record<string, JsonValue>
  const exposedFlags: Record<string, JsonValue> = Object.create(null)

  for (const name of exposedNames) {
    if (!Object.hasOwn(sourceFlags, name)) {
      throw new Error(`[feature-flags] Exposed flag "${name}" is missing from source file ${filename}`)
    }
    exposedFlags[name] = sourceFlags[name] as JsonValue
  }

  return exposedFlags
}
