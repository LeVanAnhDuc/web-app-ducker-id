// types
import type { WebAppWithCategories } from "../types";
// common
import { ApiProperty } from "@/common/openapi";
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
  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "Satellite Monitor" })
  @Expose()
  displayName!: string;

  @ApiProperty({
    type: "string",
    example: "Real-time constellation monitoring dashboard"
  })
  @ExposeOrNull()
  description!: string | null;

  @ApiProperty({
    type: "string",
    example: "https://cdn.example.com/icons/monitor.png"
  })
  @ExposeOrNull()
  iconUrl!: string | null;

  @ApiProperty({ example: "https://monitor.example.com" })
  @Expose()
  homeUrl!: string;

  /** In the order the admin chose; the first one is the primary category. */
  @ApiProperty({
    type: [PublicCategoryDto],
    description: "In the order the admin chose; the first is the primary"
  })
  @ExposeFrom<WebAppWithCategories>((doc) =>
    toDto(PublicCategoryDto, orderByCategoryIds(doc))
  )
  categories!: PublicCategoryDto[];
}

/** The card plus the viewer's own flag. Plain data: `toUserAppDto` returns an object literal typed as it. */
export class UserAppDto extends UserAppCardDto {
  @ApiProperty({ description: "Whether the caller pinned the app" })
  isFavorite!: boolean;
}

// Whether the app is a favourite depends on the viewer, not the record.
export const toUserAppDto = (
  doc: WebAppWithCategories,
  isFavorite = false
): UserAppDto => ({ ...toDto(UserAppCardDto, doc), isFavorite });
