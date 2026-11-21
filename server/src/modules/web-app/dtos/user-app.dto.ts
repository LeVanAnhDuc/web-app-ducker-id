// types
import type { WebAppWithCategories } from "../types";
// common
import {
  Expose,
  ExposeFrom,
  ExposeId,
  ExposeOrNull,
  toDto
} from "@/common/dto";
// modules
import { PublicCategoryDto } from "@/modules/category/dtos";
// others
import { orderByCategoryIds } from "../helpers";

/** Source: a web-app record with its categories (`WebAppWithCategories`). The launcher card, minus the per-user flag. */
export class UserAppCardDto {
  @ExposeId() _id!: string;
  @Expose() displayName!: string;
  @ExposeOrNull() description!: string | null;
  @ExposeOrNull() iconUrl!: string | null;
  @Expose() homeUrl!: string;
  /** In the order the admin chose; the first one is the primary category. */
  @ExposeFrom<WebAppWithCategories>((doc) =>
    toDto(PublicCategoryDto, orderByCategoryIds(doc))
  )
  categories!: PublicCategoryDto[];
}

export interface UserAppDto extends UserAppCardDto {
  isFavorite: boolean;
}

// Whether the app is a favourite depends on the viewer, not the record.
export const toUserAppDto = (
  doc: WebAppWithCategories,
  isFavorite = false
): UserAppDto => ({ ...toDto(UserAppCardDto, doc), isFavorite });
