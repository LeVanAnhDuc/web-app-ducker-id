// common
import { Expose, ExposeId } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// others
import { CategoryNameDto, ExposeCategoryName } from "./category-name.dto";

/** Source: a category record with its `appCount` (`CategoryWithAppCount`). */
export class AdminCategoryDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the category"
  })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "internal-tools" })
  @Expose()
  slug!: string;

  @ApiProperty({ type: CategoryNameDto })
  @ExposeCategoryName()
  name!: CategoryNameDto;

  @ApiProperty({ type: "integer", example: 0 })
  @Expose()
  sortOrder!: number;

  @ApiProperty({
    type: "integer",
    example: 2,
    description: "Apps referencing this category, active or not"
  })
  @Expose()
  appCount!: number;
}
