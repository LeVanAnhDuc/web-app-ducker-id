// modules
import { CATEGORY_CONFIG } from "./constants";

const ZERO_WIDTH = /[\u200B-\u200D\u2060\uFEFF]/g;
const WHITESPACE_RUN = /\s+/g;
const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARS = /[^a-z0-9]+/g;
const EDGE_DASHES = /^-+|-+$/g;

/**
 * Pasted names carry invisible characters that a plain `trim()` keeps, and the
 * unique index would then accept "Content" twice. Strip them, fold NBSP and
 * other whitespace runs into one space, then trim.
 */
export const normalizeCategoryName = (value: string): string =>
  value.replace(ZERO_WIDTH, "").replace(WHITESPACE_RUN, " ").trim();

/**
 * `đ` has no decomposition under NFD/NFKD, so it would otherwise be dropped as
 * a non-slug character ("Đa dạng" → "a-dang"). The base is capped below the
 * slug limit to leave room for a `-n` suffix.
 */
export const slugifyCategoryName = (value: string): string =>
  value
    .replace(/[đĐ]/g, "d")
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_SLUG_CHARS, "-")
    .replace(EDGE_DASHES, "")
    .slice(0, CATEGORY_CONFIG.SLUG_BASE_MAX_LENGTH)
    .replace(EDGE_DASHES, "");

/** `base` itself for the first slot, then `base-2`, `base-3`, … */
export const pickFreeSlug = (base: string, taken: string[]): string => {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
};
