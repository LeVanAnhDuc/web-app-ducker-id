// modules
import { SearchFilter } from "@/modules/web-app/dtos/requests/app-filters";
// validators
import { PageQueryDto } from "@/validators/dtos/pagination.query";

// Ordered by last use, fixed by the server, so there is no sortOrder.
export class ListRecentAppsQueryDto extends PageQueryDto {
  @SearchFilter()
  search?: string;
}
