// common
import { ApiProperty } from "@/common/openapi";
// validators
import { SearchFilter } from "@/validators/decorators";
import { PageQueryDto } from "@/validators/dtos/pagination.query";

// Ordered by last use, fixed by the server, so there is no sortOrder.
export class ListRecentAppsQueryDto extends PageQueryDto {
  @ApiProperty({
    example: "blog",
    description:
      "Case-insensitive match on the app name, display name or description"
  })
  @SearchFilter()
  search?: string;
}
