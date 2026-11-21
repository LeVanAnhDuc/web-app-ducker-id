// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure of an id the same key; each still keeps its own
// constraint name so `reason` tells them apart.
export class AdminUserIdParamsDto {
  @ApiProperty({
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "MongoDB ObjectId of the target user"
  })
  @IsRequiredObjectId("user:errors.invalidId")
  id!: string;
}
