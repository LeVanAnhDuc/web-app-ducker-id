// common
import { Expose, ExposeFrom, toDto } from "@/common/dto";

/** `{ en, vi }` — rebuilt rather than copied, so a subdocument `_id` never leaks. */
export class CategoryNameDto {
  @Expose() en!: string;
  @Expose() vi!: string;
}

/** The category's `name`, mapped through {@link CategoryNameDto}. */
export const ExposeCategoryName = (): PropertyDecorator =>
  ExposeFrom((src) => toDto(CategoryNameDto, src.name as object));
