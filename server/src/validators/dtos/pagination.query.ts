// libs
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
// types
import type { SortOrder } from "@/common/sort";
// common
import { ApiProperty } from "@/common/openapi/api-property";
import { PAGINATION } from "@/common/pagination";
import { SORT_ORDER_VALUES } from "@/common/sort";
// validators
import { ToInt } from "@/validators/decorators";

/** `page` / `limit` alone, for a list whose order is fixed by the server. */
export class PageQueryDto {
  @ApiProperty({ example: 1, description: "1-based page number (default 1)" })
  @Min(1, { message: "validation:page.invalid" })
  @IsInt({ message: "validation:page.invalid" })
  @IsOptional()
  @ToInt()
  page?: number;

  @ApiProperty({ example: 20, description: "Page size (default 20, max 100)" })
  @Max(PAGINATION.MAX_LIMIT, { message: "validation:limit.invalid" })
  @Min(1, { message: "validation:limit.invalid" })
  @IsInt({ message: "validation:limit.invalid" })
  @IsOptional()
  @ToInt()
  limit?: number;
}

/** `page` / `limit` / `sortOrder` as every list query declares them; extend per module. */
export class PaginationQueryDto extends PageQueryDto {
  @ApiProperty({
    example: "desc",
    description: "Sort direction (default desc)"
  })
  @IsIn(SORT_ORDER_VALUES, { message: "validation:sortOrder.invalid" })
  @IsString({ message: "validation:sortOrder.invalid" })
  @IsOptional()
  sortOrder?: SortOrder;
}
