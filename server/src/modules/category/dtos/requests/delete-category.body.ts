// libs
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, ValidateNested } from "class-validator";
// modules
import { CATEGORY_CONFIG } from "@/modules/category/constants";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

export class CategoryReassignmentDto {
  @IsRequiredObjectId("category:validation.appId.invalid")
  appId!: string;

  @IsRequiredObjectId("category:validation.targetId.invalid")
  categoryId!: string;
}

export class DeleteCategoryBodyDto {
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
  @Type(() => CategoryReassignmentDto)
  reassignments: CategoryReassignmentDto[] = [];
}
