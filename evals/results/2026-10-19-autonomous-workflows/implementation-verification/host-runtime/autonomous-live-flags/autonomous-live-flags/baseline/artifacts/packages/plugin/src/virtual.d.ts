declare module 'virtual:feature-flags' {
  export type FeatureFlagPrimitive = boolean | number | string | null
  export type FeatureFlagValue =
    | FeatureFlagPrimitive
    | { readonly [key: string]: FeatureFlagValue }
    | readonly FeatureFlagValue[]

  /** Flags selected by the plugin's `expose` option. */
  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
