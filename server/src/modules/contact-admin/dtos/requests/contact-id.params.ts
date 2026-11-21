// validators
import { IsRequiredObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class ContactIdParamsDto {
  @IsRequiredObjectId("contactAdmin:errors.invalidId")
  id!: string;
}
