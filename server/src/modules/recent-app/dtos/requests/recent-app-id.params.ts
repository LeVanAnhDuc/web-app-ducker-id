// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi shipped English for a wrong type; `.invalid` is the nearest key.
export class RecentAppIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the app"
  })
  @IsObjectId("recentApp:validation.appId.invalid")
  @IsNotEmpty({ message: "recentApp:validation.appId.required" })
  @IsString({ message: "recentApp:validation.appId.invalid" })
  @IsDefined({ message: "recentApp:validation.appId.required" })
  appId!: string;
}
