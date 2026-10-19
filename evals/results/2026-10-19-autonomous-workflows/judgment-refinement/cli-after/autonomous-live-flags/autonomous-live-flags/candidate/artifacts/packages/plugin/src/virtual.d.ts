declare module 'virtual:feature-flags' {
  export type FeatureFlagValue =
    | boolean
    | number
    | string
    | null
    | readonly FeatureFlagValue[]
    | { readonly [key: string]: FeatureFlagValue }

  export type FeatureFlags = Readonly<Record<string, FeatureFlagValue>>

  export const flags: FeatureFlags
}
