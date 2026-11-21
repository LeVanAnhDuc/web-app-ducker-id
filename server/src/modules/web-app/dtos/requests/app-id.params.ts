// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsObjectId } from "@/validators/decorators";

export class AppIdParamsDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "MongoDB ObjectId of the app"
  })
  @IsObjectId("webApp:validation.id.invalid")
  @IsNotEmpty({ message: "webApp:validation.id.required" })
  @IsString({ message: "webApp:validation.id.invalid" })
  @IsDefined({ message: "webApp:validation.id.required" })
  id!: string;
}
