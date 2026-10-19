import { readFile } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { HmrContext, Plugin, ResolvedConfig } from 'vite'

export type FeatureFlagValue =
  | boolean
  | number
  | string
  | null
  | readonly FeatureFlagValue[]
  | { readonly [key: string]: FeatureFlagValue }

export interface FeatureFlagsOptions {
  /** A JSON file path, resolved from the Vite project root, or a local file URL. */
  readonly source: string | URL
  /** The only flag names that may be included in client modules. */
  readonly expose: readonly string[]
}

const publicModuleId = 'virtual:feature-flags'
const resolvedModuleId = `\0${publicModuleId}`

export function featureFlags(options: FeatureFlagsOptions): Plugin {
  const configuredSource = validateOptions(options)
  const exposedNames = [...new Set(options.expose)]
  let sourcePath = sourcePathForRoot(configuredSource, process.cwd())

  return {
    name: 'feature-flags',

    configResolved(config: ResolvedConfig) {
      sourcePath = sourcePathForRoot(configuredSource, config.root)
    },

    resolveId(id: string) {
      return id === publicModuleId ? resolvedModuleId : null
    },

    async load(id: string) {
      if (id !== resolvedModuleId) return null

      this.addWatchFile(sourcePath)
      const flags = await loadExposedFlags(sourcePath, exposedNames)
      const serializedFlags = JSON.stringify(flags)

      return {
        code: `export const flags = Object.freeze(JSON.parse(${JSON.stringify(serializedFlags)}));\n`,
        map: null,
      }
    },

    handleHotUpdate(context: HmrContext) {
      if (resolve(context.file) !== resolve(sourcePath)) return

      const module = context.server.moduleGraph.getModuleById(resolvedModuleId)
      if (!module) return []

      context.server.moduleGraph.invalidateModule(module)
      return [module]
    },
  }
}

function validateOptions(options: FeatureFlagsOptions): string | URL {
  if (!options || (typeof options.source !== 'string' && !(options.source instanceof URL))) {
    throw new TypeError('[feature-flags] "source" must be a filesystem path or file URL')
  }
  if (typeof options.source === 'string' && options.source.length === 0) {
    throw new TypeError('[feature-flags] "source" must not be empty')
  }
  if (!Array.isArray(options.expose) || options.expose.some((name) => typeof name !== 'string')) {
    throw new TypeError('[feature-flags] "expose" must be an array of flag names')
  }
  if (options.source instanceof URL && options.source.protocol !== 'file:') {
    throw new TypeError(
      `[feature-flags] "source" must be a local file URL; received ${options.source.protocol}`,
    )
  }

  return options.source
}

function sourcePathForRoot(source: string | URL, root: string): string {
  if (source instanceof URL) return fileURLToPath(source)
  return isAbsolute(source) ? source : resolve(root, source)
}

async function loadExposedFlags(
  sourcePath: string,
  exposedNames: readonly string[],
): Promise<Record<string, FeatureFlagValue>> {
  let sourceText: string
  try {
    sourceText = await readFile(sourcePath, 'utf8')
  } catch (error) {
    throw new Error(
      `[feature-flags] Unable to read ${JSON.stringify(sourcePath)}: ${errorMessage(error)}`,
      { cause: error },
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(sourceText)
  } catch (error) {
    throw new Error(
      `[feature-flags] Invalid JSON in ${JSON.stringify(sourcePath)}: ${errorMessage(error)}`,
      { cause: error },
    )
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError(
      `[feature-flags] Expected a JSON object in ${JSON.stringify(sourcePath)}`,
    )
  }

  const sourceFlags = parsed as Record<string, FeatureFlagValue>
  const exposedFlags: Record<string, FeatureFlagValue> = Object.create(null)

  for (const name of exposedNames) {
    if (!Object.hasOwn(sourceFlags, name)) {
      throw new Error(
        `[feature-flags] Exposed flag ${JSON.stringify(name)} is missing from ${JSON.stringify(sourcePath)}`,
      )
    }
    exposedFlags[name] = sourceFlags[name] as FeatureFlagValue
  }

  return exposedFlags
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
