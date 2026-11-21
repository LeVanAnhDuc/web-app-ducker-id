// types
import type { CategoryNameDto } from "./category-name.dto";
// common
import { Expose, ExposeId } from "@/common/dto";
// others
import { ExposeCategoryName } from "./category-name.dto";

/** What a non-admin may see of a category — no counts, no ordering internals. */
export class PublicCategoryDto {
  @ExposeId() _id!: string;
  @Expose() slug!: string;
  @ExposeCategoryName() name!: CategoryNameDto;
}
