// libs
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
// validators
import { IsObjectId } from "@/validators/decorators";

// Joi gave every failure the same key; each keeps its own constraint name so
// `reason` still tells them apart.
export class ContactIdParamsDto {
  @IsObjectId("contactAdmin:errors.invalidId")
  @IsNotEmpty({ message: "contactAdmin:errors.invalidId" })
  @IsString({ message: "contactAdmin:errors.invalidId" })
  @IsDefined({ message: "contactAdmin:errors.invalidId" })
  id!: string;
}
