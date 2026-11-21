// libs
import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";
// types
import type { NotificationCategory } from "@/modules/notification/types";
// modules
import { NOTIFICATION_CATEGORIES } from "@/modules/notification/constants";
// validators
import { ToBoolean } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const CATEGORY_VALUES = Object.values(NOTIFICATION_CATEGORIES);

export class NotificationListQueryDto extends PaginationQueryDto {
  @IsBoolean({ message: "validation:isRead.invalid" })
  @IsOptional()
  @ToBoolean()
  isRead?: boolean;

  @IsIn(CATEGORY_VALUES, { message: "validation:category.invalid" })
  @IsString({ message: "validation:category.invalid" })
  @IsOptional()
  category?: NotificationCategory;
}
