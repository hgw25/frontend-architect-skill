import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin, ResolvedConfig } from 'vite'

const virtualModuleId = 'virtual:feature-flags'
const resolvedVirtualModuleId = `\0${virtualModuleId}`

export interface FeatureFlagsOptions {
  /** JSON file containing all feature flags, including server-only values. */
  source: string | URL
  /** The only keys that may be included in browser code. */
  expose: readonly string[]
}

/**
 * Exposes an explicit subset of a JSON feature-flag file through
 * `virtual:feature-flags`.
 *
 * The source is read again whenever Vite reloads the virtual module, so edits
 * are reflected by the development server without restarting it.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  assertOptions(options)

  const exposedKeys = [...new Set(options.expose)]
  let sourcePath = resolveSource(options.source, process.cwd())

  return {
    name: 'feature-flags',

    configResolved(config: ResolvedConfig) {
      sourcePath = resolveSource(options.source, config.root)
    },

    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId
      }
    },

    async load(id: string) {
      if (id !== resolvedVirtualModuleId) {
        return
      }

      this.addWatchFile(sourcePath)

      let contents: string
      try {
        contents = await readFile(sourcePath, 'utf8')
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : ''
        this.error(`Unable to read feature flags from ${sourcePath}${detail}`)
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(contents)
      } catch (error) {
        const detail = error instanceof Error ? `: ${error.message}` : ''
        this.error(`Invalid feature flags JSON in ${sourcePath}${detail}`)
      }

      if (!isRecord(parsed)) {
        this.error(`Feature flags in ${sourcePath} must be a JSON object`)
      }

      const exposed: Record<string, unknown> = Object.create(null)
      for (const key of exposedKeys) {
        if (!Object.hasOwn(parsed, key)) {
          this.error(`Missing exposed feature flag "${key}" in ${sourcePath}`)
        }
        exposed[key] = parsed[key]
      }

      return `export const flags = ${serializeForJavaScript(exposed)};\n`
    },

    handleHotUpdate(context) {
      if (resolve(context.file) !== sourcePath) {
        return
      }

      const flagsModule = context.server.moduleGraph.getModuleById(
        resolvedVirtualModuleId,
      )
      if (!flagsModule) {
        return []
      }

      context.server.moduleGraph.invalidateModule(flagsModule)
      return [flagsModule]
    },
  }
}

function assertOptions(options: FeatureFlagsOptions): void {
  if (!options || typeof options !== 'object') {
    throw new TypeError('featureFlags requires an options object')
  }
  if (!(typeof options.source === 'string' || options.source instanceof URL)) {
    throw new TypeError('featureFlags source must be a filesystem path or file URL')
  }
  if (!Array.isArray(options.expose) || options.expose.some((key) => typeof key !== 'string')) {
    throw new TypeError('featureFlags expose must be an array of flag names')
  }
}

function resolveSource(source: string | URL, root: string): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new TypeError('featureFlags source URL must use the file: protocol')
    }
    return resolve(fileURLToPath(source))
  }

  return resolve(isAbsolute(source) ? source : resolve(root, source))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serializeForJavaScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
