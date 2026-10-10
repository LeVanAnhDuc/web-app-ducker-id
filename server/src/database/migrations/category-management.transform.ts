// types
import type { CategoryName } from "@/modules/category/types";
// modules
import {
  normalizeCategoryName,
  pickFreeSlug,
  slugifyCategoryName
} from "@/modules/category/category.helper";

/** A category document as the pre-feature schema stored it. */
export interface LegacyCategory {
  _id: unknown;
  name: string;
  displayName: string;
  sortOrder?: number;
}

export interface MigratedCategory {
  _id: unknown;
  slug: string;
  name: CategoryName;
  sortOrder: number;
}

/**
 * The client used to translate these four seeded slugs from its locale files.
 * Carrying the Vietnamese over keeps /vi showing the same labels after the map
 * is deleted; any other category falls back to its English name.
 */
export const LEGACY_VI_NAMES: Record<string, string> = {
  content: "Nội dung",
  tools: "Công cụ nội bộ",
  identity: "Định danh",
  productivity: "Năng suất"
};

/**
 * English names that differ only by case would make the new case-insensitive
 * unique index fail halfway through (DR-22) — report them before writing.
 */
export const findCaseInsensitiveDuplicates = (names: string[]): string[] => {
  const seen = new Map<string, string>();
  const duplicates = new Set<string>();
  for (const name of names) {
    const key = name.toLocaleLowerCase("en");
    const first = seen.get(key);
    if (first !== undefined) {
      duplicates.add(first);
      duplicates.add(name);
    } else {
      seen.set(key, name);
    }
  }
  return [...duplicates];
};

/**
 * Display order is kept but renumbered 0..n-1, and every slug is derived from
 * name.en (DR-7) — the old slug was set by hand and may not match the name.
 * A name with no slug-able character keeps its legacy slug as the base.
 */
export const migrateCategories = (
  legacy: LegacyCategory[]
): MigratedCategory[] => {
  const ordered = [...legacy].sort(
    (a, b) =>
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      String(a._id).localeCompare(String(b._id))
  );
  const taken: string[] = [];

  return ordered.map((doc, index) => {
    const en = normalizeCategoryName(doc.displayName || doc.name);
    const base = slugifyCategoryName(en) || slugifyCategoryName(doc.name);
    const slug = pickFreeSlug(base, taken);
    taken.push(slug);
    return {
      _id: doc._id,
      slug,
      name: { en, vi: LEGACY_VI_NAMES[doc.name] ?? en },
      sortOrder: index
    };
  });
};
