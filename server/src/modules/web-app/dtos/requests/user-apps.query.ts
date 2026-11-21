// common
import { ApiProperty } from "@/common/openapi";
// validators
import { ObjectIdFilter, SearchFilter } from "@/validators/decorators";
import { PageQueryDto } from "@/validators/dtos/pagination.query";

// The launcher's order is fixed by the repository, so there is no sortOrder.
export class UserAppsQueryDto extends PageQueryDto {
  @ApiProperty({
    example: "blog",
    description:
      "Case-insensitive keyword to match name / display name / description"
  })
  @SearchFilter()
  search?: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "Apps having this category among their categories"
  })
  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;
}
