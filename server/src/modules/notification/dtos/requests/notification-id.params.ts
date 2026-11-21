// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi keyed only a missing or malformed id; a blank or wrong-typed one shipped
// English, so every failure takes the one key.
export class NotificationIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "MongoDB ObjectId of the notification"
  })
  @IsRequiredObjectId("validation:id.invalid")
  id!: string;
}
