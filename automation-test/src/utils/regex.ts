// Text to RegExp. A display name or a message can carry `.`, `(`, `+`…; built
// into a pattern unescaped it would match the wrong thing or throw.

/** Escapes every RegExp metacharacter so `text` matches literally. */
export const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
