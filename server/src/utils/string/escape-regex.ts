/**
 * Prevents regex injection / ReDoS: metachars (. * + ? ^ $ { } ( ) | [ ] \) are
 * prefixed with a backslash, so the value is matched literally.
 */
export const escapeRegex = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
