// types
import type { WebAppStatusPublic } from "@/modules/web-app/types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "@/modules/web-app/constants";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { ObjectIdFilter, OneOf, SearchFilter } from "@/validators/decorators";

const STATUS_VALUES = Object.values(WEB_APP_STATUS_PUBLIC);

// The admin list is not paged: page, limit and sortOrder are stripped.
export class AdminAppsQueryDto {
  @ApiProperty({
    example: "monitor",
    description: "Case-insensitive keyword to match app name / display name"
  })
  @SearchFilter()
  search?: string;

  @ApiProperty({ example: "active", description: "Filter by app status" })
  @OneOf(STATUS_VALUES, "validation:status.invalid")
  status?: WebAppStatusPublic;

  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "Apps having this category among their categories"
  })
  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;
}
