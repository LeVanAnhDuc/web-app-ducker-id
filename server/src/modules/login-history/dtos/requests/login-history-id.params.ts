// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class LoginHistoryIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the login-history record"
  })
  @IsRequiredObjectId("loginHistory:errors.invalidId")
  id!: string;
}
