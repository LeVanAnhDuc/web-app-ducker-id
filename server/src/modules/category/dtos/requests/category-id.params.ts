// validators
import { IsRequiredObjectId } from "@/validators/decorators";

export class CategoryIdParamsDto {
  @IsRequiredObjectId("category:validation.id.invalid")
  id!: string;
}
