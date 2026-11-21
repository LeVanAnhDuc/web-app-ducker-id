// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class LoginHistoryIdParamsDto {
  @IsRequiredObjectId("loginHistory:errors.invalidId")
  id!: string;
}
