// libs
import { IsDefined, IsIn, IsString } from "class-validator";
// types
import type { CategoryMoveDirection } from "@/modules/category/types";
// modules
import { CATEGORY_MOVE_DIRECTIONS } from "@/modules/category/constants";

const DIRECTION_VALUES = Object.values(CATEGORY_MOVE_DIRECTIONS);

// Every failure, missing included, carries the one key Joi gave them.
export class MoveCategoryBodyDto {
  @IsIn(DIRECTION_VALUES, { message: "category:validation.direction.invalid" })
  @IsString({ message: "category:validation.direction.invalid" })
  @IsDefined({ message: "category:validation.direction.invalid" })
  direction!: CategoryMoveDirection;
}
