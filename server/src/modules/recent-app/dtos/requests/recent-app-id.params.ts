// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi shipped English for a wrong type; `.invalid` is the nearest key.
export class RecentAppIdParamsDto {
  @IsObjectId("recentApp:validation.appId.invalid")
  @IsNotEmpty({ message: "recentApp:validation.appId.required" })
  @IsString({ message: "recentApp:validation.appId.invalid" })
  @IsDefined({ message: "recentApp:validation.appId.required" })
  appId!: string;
}
