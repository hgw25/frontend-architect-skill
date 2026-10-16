declare module 'virtual:feature-flags' {
  export type FeatureFlagValue = boolean | number | string
  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
