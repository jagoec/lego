/** Joins truthy class names — a two-line replacement for a classnames lib. */
export function cls(...parts: ReadonlyArray<string | false | null | undefined>): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' ');
}
