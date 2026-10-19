import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'

const PUBLIC_VIRTUAL_ID = 'virtual:feature-flags'
const RESOLVED_VIRTUAL_ID = `\0${PUBLIC_VIRTUAL_ID}`

export type FeatureFlagValue =
  | boolean
  | number
  | string
  | null
  | readonly FeatureFlagValue[]
  | { readonly [key: string]: FeatureFlagValue }

export type FeatureFlags = Readonly<Record<string, FeatureFlagValue>>

export interface FeatureFlagsOptions {
  /** A filesystem path or file URL to a JSON object containing the flags. */
  source: string | URL
  /** The only flag names that may be included in client-side code. */
  expose: readonly string[]
}

type JsonObject = Record<string, FeatureFlagValue>

/**
 * Makes an explicitly allow-listed subset of a JSON feature-flag file available
 * as `virtual:feature-flags`.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  validateOptions(options)

  let sourcePath: string | undefined

  return {
    name: 'feature-flags',

    async configResolved(config) {
      sourcePath = resolveSourcePath(options.source, config)
      await readExposedFlags(sourcePath, options.expose)
    },

    resolveId(id) {
      return id === PUBLIC_VIRTUAL_ID ? RESOLVED_VIRTUAL_ID : undefined
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) {
        return undefined
      }

      const flags = await readExposedFlags(requireSourcePath(sourcePath), options.expose)
      return `export const flags = Object.freeze(${JSON.stringify(flags)});\n`
    },

    configureServer(server) {
      server.watcher.add(requireSourcePath(sourcePath))
    },

    handleHotUpdate(context) {
      if (resolve(context.file) !== requireSourcePath(sourcePath)) {
        return undefined
      }

      return invalidateVirtualModule(context.server)
    },
  }
}

function validateOptions(options: FeatureFlagsOptions): void {
  if (!options || typeof options !== 'object') {
    throw new TypeError('featureFlags requires an options object.')
  }

  if (typeof options.source !== 'string' && !(options.source instanceof URL)) {
    throw new TypeError('featureFlags option "source" must be a filesystem path or file URL.')
  }

  if (!Array.isArray(options.expose) || options.expose.some((name) => typeof name !== 'string' || !name)) {
    throw new TypeError('featureFlags option "expose" must be an array of non-empty flag names.')
  }
}

function resolveSourcePath(source: string | URL, config: ResolvedConfig): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new TypeError(`featureFlags option "source" must use the file: protocol, received ${source.protocol}`)
    }

    return fileURLToPath(source)
  }

  return isAbsolute(source) ? source : resolve(config.root, source)
}

async function readExposedFlags(sourcePath: string, expose: readonly string[]): Promise<FeatureFlags> {
  let source: string

  try {
    source = await readFile(sourcePath, 'utf8')
  } catch (error) {
    throw new Error(`Could not read feature flags from ${sourcePath}: ${messageFor(error)}`)
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new Error(`Could not parse feature flags JSON in ${sourcePath}: ${messageFor(error)}`)
  }

  if (!isJsonObject(parsed)) {
    throw new Error(`Feature flags in ${sourcePath} must be a JSON object.`)
  }

  const exposed: Record<string, FeatureFlagValue> = {}
  for (const name of expose) {
    if (!Object.hasOwn(parsed, name)) {
      throw new Error(`Feature flag "${name}" is missing in ${sourcePath}.`)
    }
    exposed[name] = parsed[name]!
  }

  return exposed
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireSourcePath(sourcePath: string | undefined): string {
  if (!sourcePath) {
    throw new Error('featureFlags could not resolve its source file before use.')
  }

  return sourcePath
}

function invalidateVirtualModule(server: ViteDevServer) {
  const virtualModule = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID)
  if (!virtualModule) {
    return []
  }

  server.moduleGraph.invalidateModule(virtualModule)
  return [virtualModule]
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
