// libs
import { IsBoolean, IsOptional } from "class-validator";
// types
import type { NotificationCategory } from "@/modules/notification/types";
// modules
import { NOTIFICATION_CATEGORIES } from "@/modules/notification/constants";
// validators
import { OneOf, ToBoolean } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const CATEGORY_VALUES = Object.values(NOTIFICATION_CATEGORIES);

export class NotificationListQueryDto extends PaginationQueryDto {
  @IsBoolean({ message: "validation:isRead.invalid" })
  @IsOptional()
  @ToBoolean()
  isRead?: boolean;

  @OneOf(CATEGORY_VALUES, "validation:category.invalid")
  category?: NotificationCategory;
}
