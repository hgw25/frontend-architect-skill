declare module 'virtual:feature-flags' {
  export type FeatureFlagValue =
    | boolean
    | number
    | string
    | null
    | { readonly [key: string]: FeatureFlagValue }
    | readonly FeatureFlagValue[]

  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
