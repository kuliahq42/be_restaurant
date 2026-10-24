/**
 * Route handlers return database records whose ids are BigInt, which
 * `JSON.stringify` cannot serialize. This deep-converts BigInt to string
 * (recursively, through nested objects and arrays) so payloads are JSON-safe.
 * Date instances are converted to ISO strings as a side effect.
 */
export function serialize<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}
