// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi keyed only a missing or malformed id; a blank or wrong-typed one shipped
// English, so every failure takes the one key.
export class NotificationIdParamsDto {
  @IsRequiredObjectId("validation:id.invalid")
  id!: string;
}
