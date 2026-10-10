// types
import type { WebAppWithCategories } from "../types";
import type { PublicCategoryDto } from "@/modules/category/dtos";
// modules
import { toPublicCategoryDto } from "@/modules/category/dtos";
import { orderByCategoryIds } from "../helpers";

export interface UserAppDto {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  /** In the order the admin chose; the first one is the primary category. */
  categories: PublicCategoryDto[];
  isFavorite: boolean;
}

export const toUserAppDto = (
  doc: WebAppWithCategories,
  isFavorite = false
): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  categories: orderByCategoryIds(doc).map(toPublicCategoryDto),
  isFavorite
});
