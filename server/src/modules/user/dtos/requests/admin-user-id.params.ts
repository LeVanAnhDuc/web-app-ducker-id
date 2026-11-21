// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure of an id the same key; each still keeps its own
// constraint name so `reason` tells them apart.
export class AdminUserIdParamsDto {
  @IsRequiredObjectId("user:errors.invalidId")
  id!: string;
}
