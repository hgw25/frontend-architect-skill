import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

import type { Plugin } from 'vite'

const VIRTUAL_MODULE_ID = 'virtual:feature-flags'
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`

export interface FeatureFlagsOptions {
  /** Filesystem path or file URL of a JSON object containing all flag values. */
  source: string | URL
  /** Names permitted to be included in the client-side virtual module. */
  expose: readonly string[]
}

interface NormalizedOptions {
  sourcePath: string
  exposedKeys: readonly string[]
}

/**
 * Makes an explicitly allow-listed subset of a JSON flag file available as
 * `virtual:feature-flags` in Vite applications.
 */
export function featureFlags(options: FeatureFlagsOptions): Plugin {
  const normalized = normalizeOptions(options)

  return {
    name: '@frontend-architect-eval/feature-flags',

    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) {
        return undefined
      }

      return readFlagsModule(normalized)
    },

    configureServer(server) {
      server.watcher.add(normalized.sourcePath)
    },

    handleHotUpdate({ file, server }) {
      if (resolve(file) !== normalized.sourcePath) {
        return undefined
      }

      const virtualModule = server.moduleGraph.getModuleById(
        RESOLVED_VIRTUAL_MODULE_ID,
      )

      if (!virtualModule) {
        return []
      }

      server.moduleGraph.invalidateModule(virtualModule)
      return [virtualModule]
    },
  }
}

function normalizeOptions(options: FeatureFlagsOptions): NormalizedOptions {
  if (!options || typeof options !== 'object') {
    throw new Error('featureFlags requires an options object.')
  }

  const sourcePath = normalizeSourcePath(options.source)
  const exposedKeys = normalizeExposedKeys(options.expose)

  return { sourcePath, exposedKeys }
}

function normalizeSourcePath(source: FeatureFlagsOptions['source']): string {
  if (typeof source === 'string') {
    if (source.length === 0) {
      throw new Error('featureFlags option "source" must be a non-empty filesystem path or file URL.')
    }

    return resolve(source)
  }

  if (source instanceof URL) {
    if (source.protocol !== 'file:') {
      throw new Error('featureFlags option "source" must be a filesystem path or file URL.')
    }

    return resolve(fileURLToPath(source))
  }

  throw new Error('featureFlags option "source" must be a filesystem path or file URL.')
}

function normalizeExposedKeys(expose: FeatureFlagsOptions['expose']): readonly string[] {
  if (!Array.isArray(expose)) {
    throw new Error('featureFlags option "expose" must be an array of flag names.')
  }

  const keys = new Set<string>()
  for (const key of expose) {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('featureFlags option "expose" must contain non-empty flag names.')
    }

    if (keys.has(key)) {
      throw new Error(`featureFlags option "expose" contains duplicate flag name "${key}".`)
    }

    keys.add(key)
  }

  return [...keys]
}

async function readFlagsModule({ sourcePath, exposedKeys }: NormalizedOptions): Promise<string> {
  let contents: string
  try {
    contents = await readFile(sourcePath, 'utf8')
  } catch (error) {
    throw new Error(`Could not read feature flags source "${sourcePath}": ${errorMessage(error)}`)
  }

  const parsed = parseFlagsJson(contents, sourcePath)
  const exposedFlags: Record<string, unknown> = {}

  for (const key of exposedKeys) {
    if (!Object.prototype.hasOwnProperty.call(parsed, key)) {
      throw new Error(`Feature flags source "${sourcePath}" is missing exposed key "${key}".`)
    }

    exposedFlags[key] = parsed[key]
  }

  return `export const flags = ${JSON.stringify(exposedFlags)};\n`
}

function parseFlagsJson(contents: string, sourcePath: string): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch (error) {
    throw new Error(`Could not parse feature flags source "${sourcePath}": ${errorMessage(error)}`)
  }

  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`Feature flags source "${sourcePath}" must contain a JSON object at its root.`)
  }

  return parsed as Record<string, unknown>
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
