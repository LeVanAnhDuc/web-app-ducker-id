// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

export class CategoryIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "MongoDB ObjectId of the category"
  })
  @IsRequiredObjectId("category:validation.id.invalid")
  id!: string;
}
