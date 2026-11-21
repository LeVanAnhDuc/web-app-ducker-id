// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi keyed only a missing or malformed id; a blank or wrong-typed one shipped
// English, so every failure takes the one key.
export class NotificationIdParamsDto {
  @IsObjectId("validation:id.invalid")
  @IsNotEmpty({ message: "validation:id.invalid" })
  @IsString({ message: "validation:id.invalid" })
  @IsDefined({ message: "validation:id.invalid" })
  id!: string;
}
