// libs
import { IsBoolean, IsOptional } from "class-validator";
// types
import type { NotificationCategory } from "@/modules/notification/types";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { NOTIFICATION_CATEGORIES } from "@/modules/notification/constants";
// validators
import { OneOf, ToBoolean } from "@/validators/decorators";
import { PaginationQueryDto } from "@/validators/dtos/pagination.query";

const CATEGORY_VALUES = Object.values(NOTIFICATION_CATEGORIES);

export class NotificationListQueryDto extends PaginationQueryDto {
  @ApiProperty({
    example: false,
    description: "Only read (true) or only unread (false) notifications"
  })
  @IsBoolean({ message: "validation:isRead.invalid" })
  @IsOptional()
  @ToBoolean()
  isRead?: boolean;

  @ApiProperty({
    example: "security",
    description: "Only notifications of this category"
  })
  @OneOf(CATEGORY_VALUES, "validation:category.invalid")
  category?: NotificationCategory;
}
