// types
import type { CategoryName, WebAppCategoryDocument } from "../types";

/** What a non-admin may see of a category — no counts, no ordering internals. */
export interface PublicCategoryDto {
  _id: string;
  slug: string;
  name: CategoryName;
}

export const toPublicCategoryDto = (
  doc: Pick<WebAppCategoryDocument, "_id" | "slug" | "name">
): PublicCategoryDto => ({
  _id: doc._id.toString(),
  slug: doc.slug,
  name: { en: doc.name.en, vi: doc.name.vi }
});
