// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

export class AppIdParamsDto {
  @IsObjectId("webApp:validation.id.invalid")
  @IsNotEmpty({ message: "webApp:validation.id.required" })
  @IsString({ message: "webApp:validation.id.invalid" })
  @IsDefined({ message: "webApp:validation.id.required" })
  id!: string;
}
