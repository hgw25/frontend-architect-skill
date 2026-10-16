import type { Plugin } from 'vite'

export function featureFlags(flags: Record<string, unknown>): Plugin {
  return {
    name: 'feature-flags',
    transform(code: string) {
      return code.replaceAll('__FLAGS__', JSON.stringify(flags))
    },
  }
}
