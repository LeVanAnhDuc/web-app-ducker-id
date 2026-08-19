// types
import type { WebAppWithCategory } from "@/modules/web-app/types";
import type { UserAppDto } from "@/modules/web-app/dtos";

export const toFavoriteAppDto = (doc: WebAppWithCategory): UserAppDto => ({
  _id: doc._id.toString(),
  displayName: doc.displayName,
  description: doc.description ?? null,
  iconUrl: doc.iconUrl ?? null,
  homeUrl: doc.homeUrl,
  category: doc.category?.displayName ?? null,
  categorySlug: doc.category?.name ?? null,
  isFavorite: true
});
