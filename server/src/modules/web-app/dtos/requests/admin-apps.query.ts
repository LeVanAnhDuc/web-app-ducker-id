// libs
import { IsIn, IsOptional, IsString } from "class-validator";
// types
import type { WebAppStatusPublic } from "@/modules/web-app/types";
// modules
import { WEB_APP_STATUS_PUBLIC } from "@/modules/web-app/constants";
// validators
import { ObjectIdFilter, SearchFilter } from "@/validators/decorators";

const STATUS_VALUES = Object.values(WEB_APP_STATUS_PUBLIC);

// The admin list is not paged: page, limit and sortOrder are stripped.
export class AdminAppsQueryDto {
  @SearchFilter()
  search?: string;

  @IsIn(STATUS_VALUES, { message: "validation:status.invalid" })
  @IsString({ message: "validation:status.invalid" })
  @IsOptional()
  status?: WebAppStatusPublic;

  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;
}
