// libs
import { Type } from "class-transformer";
import { IsDefined, IsObject, ValidateNested } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// others
import { NameEnRules, NameViRules } from "./category-name";

export class CreateCategoryNameDto {
  @ApiProperty({
    example: "Internal Tools",
    description: "Must contain a letter or digit"
  })
  @NameEnRules()
  @IsDefined({ message: "category:validation.nameEn.required" })
  en!: string;

  @ApiProperty({ example: "Công cụ nội bộ" })
  @NameViRules()
  @IsDefined({ message: "category:validation.nameVi.required" })
  vi!: string;
}

// Joi had one key for a missing or non-object `name`: the English name's.
export class CreateCategoryBodyDto {
  @ApiProperty({
    description:
      "Zero-width characters are stripped and whitespace collapsed; name.en must contain a letter or digit"
  })
  @ValidateNested({ message: "category:validation.nameEn.required" })
  @IsObject({ message: "category:validation.nameEn.required" })
  @IsDefined({ message: "category:validation.nameEn.required" })
  @Type(() => CreateCategoryNameDto)
  name!: CreateCategoryNameDto;
}
