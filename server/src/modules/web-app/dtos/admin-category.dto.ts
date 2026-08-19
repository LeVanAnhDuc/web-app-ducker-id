// types
import type { WebAppCategoryDocument } from "../types";

export interface AdminCategoryDto {
  _id: string;
  name: string;
  slug: string;
}

export const toAdminCategoryDto = (
  doc: WebAppCategoryDocument
): AdminCategoryDto => ({
  _id: doc._id.toString(),
  name: doc.displayName,
  slug: doc.name
});
