// libs
import { IsIn, IsOptional, IsString } from "class-validator";
// types
import type { FavoriteSort } from "@/modules/favorite/types";
// modules
import { FAVORITE_SORTS } from "@/modules/favorite/constants";
// validators
import { ObjectIdFilter, SearchFilter } from "@/validators/decorators";

const SORT_VALUES = Object.values(FAVORITE_SORTS);

// Favorites are not paged, so there is no page/limit/sortOrder: an unknown
// key is stripped, as Joi did. Search and category filter the app list the
// same way the launcher does.
export class ListFavoritesQueryDto {
  @SearchFilter()
  search?: string;

  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;

  @IsIn(SORT_VALUES, { message: "favorite:validation.sort.invalid" })
  @IsString({ message: "favorite:validation.sort.invalid" })
  @IsOptional()
  sort?: FavoriteSort;
}
