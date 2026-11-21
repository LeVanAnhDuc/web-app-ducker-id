// libs
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, ValidateNested } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// modules
import { CATEGORY_CONFIG } from "@/modules/category/constants";
// validators
import { IsRequiredObjectId, UnlessMissing } from "@/validators/decorators";

export class CategoryReassignmentDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Orphaned app"
  })
  @IsRequiredObjectId("category:validation.appId.invalid")
  appId!: string;

  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "Target category (not the one being deleted)"
  })
  @IsRequiredObjectId("category:validation.targetId.invalid")
  categoryId!: string;
}

export class DeleteCategoryBodyDto {
  @ApiProperty({
    description:
      "One entry per orphaned app, exactly matching the current orphan set (default empty)"
  })
  // A DELETE usually carries no body, so the list defaults to empty. A
  // repeated appId is not checked here: the contract answers it with
  // CATEGORY_REASSIGN_INVALID, which the service raises.
  @ValidateNested({
    each: true,
    message: "category:validation.reassignments.invalid"
  })
  @ArrayMaxSize(CATEGORY_CONFIG.MAX_REASSIGNMENTS, {
    message: "category:validation.reassignments.tooMany"
  })
  @IsArray({ message: "category:validation.reassignments.invalid" })
  // Only marks the field optional in the schema: the initialiser below means a
  // missing value is [] and the rule never skips at runtime.
  @UnlessMissing()
  @Type(() => CategoryReassignmentDto)
  reassignments: CategoryReassignmentDto[] = [];
}
