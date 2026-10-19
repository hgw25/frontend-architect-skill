declare module 'virtual:feature-flags' {
  export type FeatureFlagValue =
    | null
    | boolean
    | number
    | string
    | readonly FeatureFlagValue[]
    | { readonly [key: string]: FeatureFlagValue }

  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
