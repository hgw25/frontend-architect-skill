declare module 'virtual:feature-flags' {
  export type JsonPrimitive = boolean | number | string | null
  export type JsonValue =
    | JsonPrimitive
    | JsonValue[]
    | { [key: string]: JsonValue }

  export const flags: Readonly<Record<string, JsonValue>>
}
