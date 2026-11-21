// types
import type { FavoriteSort } from "@/modules/favorite/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { FAVORITE_SORTS } from "@/modules/favorite/constants";
// validators
import { ObjectIdFilter, OneOf, SearchFilter } from "@/validators/decorators";

const SORT_VALUES = Object.values(FAVORITE_SORTS);

// Favorites are not paged, so there is no page/limit/sortOrder: an unknown
// key is stripped, as Joi did. Search and category filter the app list the
// same way the launcher does.
export class ListFavoritesQueryDto {
  @ApiProperty({
    example: "monitor",
    description: "Matches the app name, display name or description"
  })
  @SearchFilter()
  search?: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Only apps in this category"
  })
  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;

  @ApiProperty({
    example: "recent",
    description: "Defaults to recent (most recently pinned first)"
  })
  @OneOf(SORT_VALUES, "favorite:validation.sort.invalid")
  sort?: FavoriteSort;
}
