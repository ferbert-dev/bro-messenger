/**
 * Filters an object, returning a new object with only the allowed keys.
 */
export function filterObjectByAllowedKeys<T extends object, K extends keyof T>(
  obj: T,
  allowedKeys: readonly K[]
): Partial<Pick<T, K>> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => allowedKeys.includes(key as K))
  ) as Partial<Pick<T, K>>;
}