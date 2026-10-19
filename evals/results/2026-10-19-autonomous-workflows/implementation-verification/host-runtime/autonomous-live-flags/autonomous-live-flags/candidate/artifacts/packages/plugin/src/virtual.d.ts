declare module 'virtual:feature-flags' {
  export type FeatureFlagValue =
    import('@frontend-architect-eval/feature-flags').FeatureFlagValue

  export const flags: Readonly<Record<string, FeatureFlagValue>>
}
