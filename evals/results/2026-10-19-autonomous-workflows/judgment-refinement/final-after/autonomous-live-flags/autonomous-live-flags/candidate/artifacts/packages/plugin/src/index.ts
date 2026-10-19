import { readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isAbsolute, resolve } from 'node:path'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

const virtualModuleId = 'virtual:feature-flags'
const resolvedVirtualModuleId = `\0${virtualModuleId}`

export type FeatureFlagValue =
  | boolean
  | number
  | string
  | null
  | readonly FeatureFlagValue[]
  | { readonly [key: string]: FeatureFlagValue }

export interface FeatureFlagsOptions {
  /** A JSON object on disk. Relative paths resolve from Vite's configured root. */
  source: string | URL
  /** Flag names that may be embedded in the client bundle. */
  expose: readonly string[]
}

export type FeatureFlags = Readonly<Record<string, FeatureFlagValue>>

class FeatureFlagsConfigurationError extends Error {
  constructor(message: string) {
    super(`[feature-flags] ${message}`)
    this.name = 'FeatureFlagsConfigurationError'
  }
}

function resolveSourcePath(source: string | URL, root: string): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new FeatureFlagsConfigurationError(
        `source URL must use the file: protocol; received ${source.href}`,
      )
    }

    return fileURLToPath(source)
  }

  if (typeof source !== 'string' || source.length === 0) {
    throw new FeatureFlagsConfigurationError('source must be a non-empty filesystem path or file URL')
  }

  return isAbsolute(source) ? source : resolve(root, source)
}

function validateOptions(options: FeatureFlagsOptions): void {
  if (!Array.isArray(options.expose) || options.expose.some((key) => typeof key !== 'string' || key.length === 0)) {
    throw new FeatureFlagsConfigurationError('expose must be an array of non-empty flag names')
  }

  const duplicate = options.expose.find((key, index) => options.expose.indexOf(key) !== index)
  if (duplicate) {
    throw new FeatureFlagsConfigurationError(`expose contains duplicate flag name ${JSON.stringify(duplicate)}`)
  }
}

function readExposedFlags(sourcePath: string, exposedNames: readonly string[]): FeatureFlags {
  let parsed: unknown

  try {
    parsed = JSON.parse(readFileSync(sourcePath, 'utf8'))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new FeatureFlagsConfigurationError(`could not read JSON source ${sourcePath}: ${detail}`)
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new FeatureFlagsConfigurationError(`source ${sourcePath} must contain a JSON object`)
  }

  const sourceFlags = parsed as Record<string, FeatureFlagValue>
  const entries: Array<[string, FeatureFlagValue]> = []

  for (const name of exposedNames) {
    if (!Object.hasOwn(sourceFlags, name)) {
      throw new FeatureFlagsConfigurationError(
        `exposed flag ${JSON.stringify(name)} is missing from source ${sourcePath}`,
      )
    }

    entries.push([name, sourceFlags[name]!])
  }

  return Object.freeze(Object.fromEntries(entries))
}

function createVirtualModule(flags: FeatureFlags): string {
  return `export const flags = Object.freeze(${JSON.stringify(flags)});\n`
}

function isConfiguredSource(changedPath: string, sourcePath: string): boolean {
  if (changedPath === sourcePath) {
    return true
  }

  try {
    return realpathSync(changedPath) === realpathSync(sourcePath)
  } catch {
    return false
  }
}

/**
 * Exposes an allow-listed subset of a local JSON feature-flag file through
 * `virtual:feature-flags`. Values not named by `expose` never enter client code.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  validateOptions(options)

  let sourcePath: string | undefined
  let server: ViteDevServer | undefined

  const loadFlags = (): FeatureFlags => {
    if (!sourcePath) {
      throw new FeatureFlagsConfigurationError('plugin was loaded before Vite resolved its configuration')
    }

    return readExposedFlags(sourcePath, options.expose)
  }

  const reportWatchError = (error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)
    server?.config.logger.error(message)
  }

  return {
    name: 'feature-flags',

    configResolved(config: ResolvedConfig) {
      sourcePath = resolveSourcePath(options.source, config.root)
    },

    buildStart() {
      loadFlags()
    },

    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : undefined
    },

    load(id) {
      if (id !== resolvedVirtualModuleId) {
        return undefined
      }

      return createVirtualModule(loadFlags())
    },

    configureServer(devServer) {
      server = devServer
      devServer.watcher.add(sourcePath!)

      return () => {
        server = undefined
      }
    },

    handleHotUpdate(context) {
      if (!isConfiguredSource(context.file, sourcePath!)) {
        return undefined
      }

      try {
        loadFlags()
      } catch (error) {
        reportWatchError(error)
        return []
      }

      const module = context.server.moduleGraph.getModuleById(resolvedVirtualModuleId)
      if (module) {
        context.server.moduleGraph.invalidateModule(module)
      }
      context.server.ws.send({ type: 'full-reload' })
      return []
    },
  }
}
