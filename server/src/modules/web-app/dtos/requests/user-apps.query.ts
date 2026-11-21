// validators
import { ObjectIdFilter, SearchFilter } from "@/validators/decorators";
import { PageQueryDto } from "@/validators/dtos/pagination.query";

// The launcher's order is fixed by the repository, so there is no sortOrder.
export class UserAppsQueryDto extends PageQueryDto {
  @SearchFilter()
  search?: string;

  @ObjectIdFilter("validation:categoryId.invalid")
  categoryId?: string;
}
