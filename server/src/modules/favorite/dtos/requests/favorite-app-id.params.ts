// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi shipped English for a wrong type; `.invalid` is the nearest key.
export class FavoriteAppIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB _id of the app"
  })
  @IsObjectId("favorite:validation.appId.invalid")
  @IsNotEmpty({ message: "favorite:validation.appId.required" })
  @IsString({ message: "favorite:validation.appId.invalid" })
  @IsDefined({ message: "favorite:validation.appId.required" })
  appId!: string;
}
