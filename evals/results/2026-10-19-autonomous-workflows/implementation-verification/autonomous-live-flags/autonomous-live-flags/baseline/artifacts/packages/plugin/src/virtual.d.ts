declare module 'virtual:feature-flags' {
  export type FeatureFlagPrimitive = boolean | number | string | null
  export type FeatureFlagValue =
    | FeatureFlagPrimitive
    | { readonly [key: string]: FeatureFlagValue }
    | readonly FeatureFlagValue[]

  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
