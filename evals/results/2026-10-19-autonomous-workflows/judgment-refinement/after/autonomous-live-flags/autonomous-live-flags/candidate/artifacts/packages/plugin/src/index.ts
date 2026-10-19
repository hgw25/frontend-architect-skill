import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Plugin } from 'vite'

const publicModuleId = 'virtual:feature-flags'
const resolvedModuleId = `\0${publicModuleId}`

export type FeatureFlagValue =
  | null
  | boolean
  | number
  | string
  | readonly FeatureFlagValue[]
  | { readonly [key: string]: FeatureFlagValue }

export interface FeatureFlagsOptions {
  /** An absolute or cwd-relative filesystem path, or a file URL, to a JSON object. */
  readonly source: string | URL
  /** The only source properties that may be included in client code. */
  readonly expose: readonly string[]
}

export function featureFlags(options: FeatureFlagsOptions): Plugin {
  const { source, exposedNames } = validateOptions(options)

  return {
    name: 'feature-flags',

    resolveId(id) {
      if (id === publicModuleId) return resolvedModuleId
    },

    async load(id) {
      if (id !== resolvedModuleId) return

      this.addWatchFile(source)
      const flags = await loadExposedFlags(source, exposedNames)
      const serializedFlags = JSON.stringify(flags)

      return {
        // Parsing serialized JSON preserves JSON property semantics for names such
        // as "__proto__", which have special meaning in JavaScript object literals.
        code: `export const flags = JSON.parse(${JSON.stringify(serializedFlags)});\n`,
        map: null,
      }
    },

    hotUpdate({ file, modules, timestamp }) {
      if (resolve(file) !== source) return

      const featureFlagsModule =
        this.environment.moduleGraph.getModuleById(resolvedModuleId)
      if (!featureFlagsModule) return

      this.environment.moduleGraph.invalidateModule(
        featureFlagsModule,
        new Set(),
        timestamp,
        true,
      )

      return [...new Set([...modules, featureFlagsModule])]
    },
  }
}

function validateOptions(options: FeatureFlagsOptions): {
  source: string
  exposedNames: readonly string[]
} {
  if (!options || typeof options !== 'object') {
    throw new TypeError('featureFlags() requires an options object')
  }

  const source = normalizeSource(options.source)

  if (
    !Array.isArray(options.expose) ||
    options.expose.some((key) => typeof key !== 'string')
  ) {
    throw new TypeError('featureFlags() option "expose" must be an array of flag names')
  }

  return { source, exposedNames: [...new Set(options.expose)] }
}

function normalizeSource(source: string | URL): string {
  if (typeof source === 'string') {
    if (source.length === 0) {
      throw new TypeError('featureFlags() option "source" must not be empty')
    }
    return resolve(source)
  }

  if (!(source instanceof URL)) {
    throw new TypeError(
      'featureFlags() option "source" must be a filesystem path or file URL',
    )
  }

  if (source.protocol !== 'file:') {
    throw new TypeError(
      `featureFlags() option "source" must be a file URL; received ${source.protocol}`,
    )
  }

  return resolve(fileURLToPath(source))
}

async function loadExposedFlags(
  source: string,
  exposedNames: readonly string[],
): Promise<Record<string, FeatureFlagValue>> {
  let contents: string
  try {
    contents = await readFile(source, 'utf8')
  } catch (cause) {
    throw new Error(`Unable to read feature flags source ${JSON.stringify(source)}`, {
      cause,
    })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(contents)
  } catch {
    // JSON.parse diagnostics may quote source fragments. Do not attach them:
    // non-exposed values in this server-side file can be sensitive.
    throw new Error(`Feature flags source ${JSON.stringify(source)} is not valid JSON`)
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new TypeError(
      `Feature flags source ${JSON.stringify(source)} must contain a JSON object`,
    )
  }

  const sourceFlags = parsed as Record<string, FeatureFlagValue>
  const exposedFlags: Record<string, FeatureFlagValue> = Object.create(null)

  for (const name of exposedNames) {
    if (!Object.hasOwn(sourceFlags, name)) {
      throw new Error(
        `Exposed feature flag ${JSON.stringify(name)} is missing from ${JSON.stringify(source)}`,
      )
    }
    exposedFlags[name] = sourceFlags[name] as FeatureFlagValue
  }

  return exposedFlags
}
