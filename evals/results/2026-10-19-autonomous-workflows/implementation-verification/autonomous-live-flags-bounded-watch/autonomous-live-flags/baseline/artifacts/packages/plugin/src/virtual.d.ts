declare module 'virtual:feature-flags' {
  export type FeatureFlagPrimitive = boolean | number | string | null
  export type FeatureFlagValue =
    | FeatureFlagPrimitive
    | ReadonlyArray<FeatureFlagValue>
    | { readonly [key: string]: FeatureFlagValue }
  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
