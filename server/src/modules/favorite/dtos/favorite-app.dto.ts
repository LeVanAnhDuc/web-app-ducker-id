// types
import type { WebAppWithCategories } from "@/modules/web-app/types";
import type { UserAppDto } from "@/modules/web-app/dtos";
// modules
import { toUserAppDto } from "@/modules/web-app/dtos";

export const toFavoriteAppDto = (doc: WebAppWithCategories): UserAppDto =>
  toUserAppDto(doc, true);
