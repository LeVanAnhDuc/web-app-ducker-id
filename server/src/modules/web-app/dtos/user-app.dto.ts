// types
import type { WebAppWithCategory } from "../types";

export interface UserAppDto {
  _id: string;
  displayName: string;
  description: string | null;
  iconUrl: string | null;
  homeUrl: string;
  category: string | null;
  categorySlug: string | null;
  isFavorite: boolean;
}

export const toUserAppDto = (
  doc: WebAppWithCategory,
  isFavorite = false
): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  category: doc.category?.displayName ?? null,
  categorySlug: doc.category?.name ?? null,
  isFavorite
});
