// common
import { Expose, ExposeId } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// others
import { CategoryNameDto, ExposeCategoryName } from "./category-name.dto";

/** What a non-admin may see of a category — no counts, no ordering internals. */
export class PublicCategoryDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the category"
  })
  @ExposeId()
  _id!: string;

  @ApiProperty({
    example: "internal-tools",
    description: "Derived from name.en; changes when name.en changes"
  })
  @Expose()
  slug!: string;

  @ApiProperty({ type: CategoryNameDto })
  @ExposeCategoryName()
  name!: CategoryNameDto;
}
