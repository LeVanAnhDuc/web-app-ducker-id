// types
import type { CategoryNameDto } from "./category-name.dto";
// common
import { Expose, ExposeId } from "@/common/dto";
// others
import { ExposeCategoryName } from "./category-name.dto";

/** Source: a category record with its `appCount` (`CategoryWithAppCount`). */
export class AdminCategoryDto {
  @ExposeId() _id!: string;
  @Expose() slug!: string;
  @ExposeCategoryName() name!: CategoryNameDto;
  @Expose() sortOrder!: number;
  @Expose() appCount!: number;
}
