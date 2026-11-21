// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class LoginHistoryIdParamsDto {
  @IsObjectId("loginHistory:errors.invalidId")
  @IsNotEmpty({ message: "loginHistory:errors.invalidId" })
  @IsString({ message: "loginHistory:errors.invalidId" })
  @IsDefined({ message: "loginHistory:errors.invalidId" })
  id!: string;
}
