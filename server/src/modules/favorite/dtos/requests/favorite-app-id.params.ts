// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi shipped English for a wrong type; `.invalid` is the nearest key.
export class FavoriteAppIdParamsDto {
  @IsObjectId("favorite:validation.appId.invalid")
  @IsNotEmpty({ message: "favorite:validation.appId.required" })
  @IsString({ message: "favorite:validation.appId.invalid" })
  @IsDefined({ message: "favorite:validation.appId.required" })
  appId!: string;
}
