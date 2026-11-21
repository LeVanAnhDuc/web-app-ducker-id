// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class ContactIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the contact request"
  })
  @IsRequiredObjectId("contactAdmin:errors.invalidId")
  id!: string;
}
