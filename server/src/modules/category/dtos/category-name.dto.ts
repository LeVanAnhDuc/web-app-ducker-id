// common
import { Expose, ExposeFrom, toDto } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";

/** `{ en, vi }` — rebuilt rather than copied, so a subdocument `_id` never leaks. */
export class CategoryNameDto {
  @ApiProperty({ example: "Internal tools" })
  @Expose()
  en!: string;

  @ApiProperty({ example: "Công cụ nội bộ" })
  @Expose()
  vi!: string;
}

/** The category's `name`, mapped through {@link CategoryNameDto}. */
export const ExposeCategoryName = (): PropertyDecorator =>
  ExposeFrom((src) => toDto(CategoryNameDto, src.name as object));
