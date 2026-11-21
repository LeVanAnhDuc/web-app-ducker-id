// libs
import { Type } from "class-transformer";
import { IsDefined, IsObject, ValidateNested } from "class-validator";
// validators
import { rule, UnlessMissing } from "@/validators/decorators";
// others
import { NameEnRules, NameViRules } from "./category-name";

export class UpdateCategoryNameDto {
  @NameEnRules()
  @UnlessMissing()
  en?: string;

  @NameViRules()
  @UnlessMissing()
  vi?: string;
}

/**
 * Joi's `name: object().min(1)`, counted after unknown keys are stripped:
 * `{ fr: "…" }` names nothing. Reported on `name`, not on the body.
 */
const HasCategoryName = (options: { message: string }): PropertyDecorator =>
  rule(
    "hasCategoryName",
    (value) => {
      const name = value as Partial<UpdateCategoryNameDto>;
      return name.en !== undefined || name.vi !== undefined;
    },
    options
  );

export class UpdateCategoryBodyDto {
  @ValidateNested({ message: "category:validation.body.empty" })
  @HasCategoryName({ message: "category:validation.body.empty" })
  @IsObject({ message: "category:validation.body.empty" })
  @IsDefined({ message: "category:validation.body.empty" })
  @Type(() => UpdateCategoryNameDto)
  name!: UpdateCategoryNameDto;
}
