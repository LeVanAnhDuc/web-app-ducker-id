// validators
import { PageQueryDto } from "@/validators/dtos/pagination.query";
// others
import { CategoryIdFilter, SearchFilter } from "./app-filters";

// The launcher's order is fixed by the repository, so there is no sortOrder.
export class UserAppsQueryDto extends PageQueryDto {
  @SearchFilter()
  search?: string;

  @CategoryIdFilter()
  categoryId?: string;
}
