// types
import type { CategoryName, CategoryWithAppCount } from "../types";

export interface AdminCategoryDto {
  _id: string;
  slug: string;
  name: CategoryName;
  sortOrder: number;
  appCount: number;
}

export const toAdminCategoryDto = (
  doc: CategoryWithAppCount
): AdminCategoryDto => ({
  _id: doc._id.toString(),
  slug: doc.slug,
  name: { en: doc.name.en, vi: doc.name.vi },
  sortOrder: doc.sortOrder,
  appCount: doc.appCount
});
