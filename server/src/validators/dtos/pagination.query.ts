// libs
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
// types
import type { SortOrder } from "@/common/sort";
// common
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import { ToInt } from "@/validators/decorators";

/** `page` / `limit` / `sortOrder` as every list query declares them; extend per module. */
export class PaginationQueryDto {
  @Min(1, { message: "validation:page.invalid" })
  @IsInt({ message: "validation:page.invalid" })
  @IsOptional()
  @ToInt()
  page?: number;

  @Max(PAGINATION.MAX_LIMIT, { message: "validation:limit.invalid" })
  @Min(1, { message: "validation:limit.invalid" })
  @IsInt({ message: "validation:limit.invalid" })
  @IsOptional()
  @ToInt()
  limit?: number;

  @IsIn(SORT_ORDER_VALUES, { message: "validation:sortOrder.invalid" })
  @IsString({ message: "validation:sortOrder.invalid" })
  @IsOptional()
  sortOrder?: SortOrder;
}
