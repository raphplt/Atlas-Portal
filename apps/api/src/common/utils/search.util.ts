/**
 * Escapes special characters for PostgreSQL ILIKE patterns.
 * The characters %, _ and \ have special meaning in LIKE/ILIKE
 * and must be escaped with a backslash.
 */
export function escapeIlike(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
