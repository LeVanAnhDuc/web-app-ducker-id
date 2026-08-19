/**
 * Escapes regular-expression metacharacters in a user-supplied string so it can
 * be safely embedded as a literal inside a MongoDB `$regex` pattern.
 *
 * Prevents regex injection / ReDoS: metachars (. * + ? ^ $ { } ( ) | [ ] \) are
 * prefixed with a backslash, so the value is matched literally.
 */
export const escapeRegex = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
