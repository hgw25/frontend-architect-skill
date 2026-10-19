import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import type { Plugin, ResolvedConfig } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:feature-flags'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export type FeatureFlagValue =
  | null
  | boolean
  | number
  | string
  | readonly FeatureFlagValue[]
  | { readonly [key: string]: FeatureFlagValue }

export interface FeatureFlagsOptions {
  /** Path (relative to the Vite root) or file URL of the JSON flag object. */
  source: string | URL
  /** Names that may be included in browser code. */
  expose: readonly string[]
}

type FeatureFlags = Readonly<Record<string, FeatureFlagValue>>

function configurationError(message: string): Error {
  return new Error(`[feature-flags] ${message}`)
}

function validateOptions(options: FeatureFlagsOptions): void {
  if (!options || typeof options !== 'object') {
    throw configurationError('Expected an options object.')
  }

  if (typeof options.source !== 'string' && !(options.source instanceof URL)) {
    throw configurationError('Expected "source" to be a filesystem path or file URL.')
  }

  if (!Array.isArray(options.expose) || options.expose.some((key) => typeof key !== 'string' || key.length === 0)) {
    throw configurationError('Expected "expose" to be an array of non-empty flag names.')
  }
}

function resolveSourcePath(source: string | URL, config: ResolvedConfig): string {
  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw configurationError(`Expected a file URL for "source", received ${source.href}.`)
    }

    return fileURLToPath(source)
  }

  if (source.startsWith('file:')) {
    try {
      return fileURLToPath(source)
    } catch {
      throw configurationError(`Invalid file URL for "source": ${source}.`)
    }
  }

  return resolve(config.root, source)
}

function isFeatureFlagValue(value: unknown): value is FeatureFlagValue {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return true
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
  }

  if (Array.isArray(value)) {
    return value.every(isFeatureFlagValue)
  }

  return typeof value === 'object' && Object.values(value).every(isFeatureFlagValue)
}

function isFlagObject(value: unknown): value is Record<string, FeatureFlagValue> {
  return value !== null && !Array.isArray(value) && typeof value === 'object' && Object.values(value).every(isFeatureFlagValue)
}

function readFlagObject(contents: string, sourcePath: string): Record<string, FeatureFlagValue> {
  let parsed: unknown

  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid JSON'
    throw configurationError(`Could not parse ${sourcePath}: ${reason}`)
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw configurationError(`Expected ${sourcePath} to contain a JSON object.`)
  }

  if (!isFlagObject(parsed)) {
    throw configurationError(`Expected ${sourcePath} to contain JSON-compatible flag values.`)
  }

  return parsed
}

async function readExposedFlags(sourcePath: string, exposedKeys: readonly string[]): Promise<FeatureFlags> {
  let contents: string

  try {
    contents = await readFile(sourcePath, 'utf8')
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unable to read file'
    throw configurationError(`Could not read ${sourcePath}: ${reason}`)
  }

  const allFlags = readFlagObject(contents, sourcePath)
  const selectedFlags: Record<string, FeatureFlagValue> = {}

  for (const key of new Set(exposedKeys)) {
    if (!Object.hasOwn(allFlags, key)) {
      throw configurationError(`Exposed flag "${key}" is missing from ${sourcePath}.`)
    }

    selectedFlags[key] = allFlags[key]!
  }

  return selectedFlags
}

/**
 * Exposes an explicit, client-safe subset of a JSON feature-flag file through
 * `virtual:feature-flags`.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  validateOptions(options)

  let sourcePath: string | undefined
  let currentFlags: FeatureFlags | undefined

  const refreshFlags = async (): Promise<void> => {
    if (!sourcePath) {
      throw configurationError('The Vite configuration has not resolved the flag source yet.')
    }

    currentFlags = await readExposedFlags(sourcePath, options.expose)
  }

  return {
    name: 'feature-flags',

    configResolved(config) {
      sourcePath = resolveSourcePath(options.source, config)
    },

    async buildStart() {
      await refreshFlags()
      this.addWatchFile(sourcePath!)
    },

    configureServer(server) {
      if (sourcePath) {
        server.watcher.add(sourcePath)
      }
    },

    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return undefined
      }

      if (!currentFlags) {
        await refreshFlags()
      }

      return `export const flags = Object.freeze(${JSON.stringify(currentFlags)});`
    },

    async handleHotUpdate(context) {
      if (!sourcePath || resolve(context.file) !== resolve(sourcePath)) {
        return undefined
      }

      await refreshFlags()
      const virtualModule = context.server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID)
      return virtualModule ? [virtualModule] : []
    },
  }
}
