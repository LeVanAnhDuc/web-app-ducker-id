// libs
import { Type } from "class-transformer";
import { IsDefined, IsObject, ValidateNested } from "class-validator";
// others
import { NameEnRules, NameViRules } from "./category-name";

export class CreateCategoryNameDto {
  @NameEnRules()
  @IsDefined({ message: "category:validation.nameEn.required" })
  en!: string;

  @NameViRules()
  @IsDefined({ message: "category:validation.nameVi.required" })
  vi!: string;
}

// Joi had one key for a missing or non-object `name`: the English name's.
export class CreateCategoryBodyDto {
  @ValidateNested({ message: "category:validation.nameEn.required" })
  @IsObject({ message: "category:validation.nameEn.required" })
  @IsDefined({ message: "category:validation.nameEn.required" })
  @Type(() => CreateCategoryNameDto)
  name!: CreateCategoryNameDto;
}
