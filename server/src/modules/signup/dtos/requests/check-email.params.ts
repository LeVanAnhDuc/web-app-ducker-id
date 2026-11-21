// validators
import { IsAppEmail } from "@/validators/decorators";

export class CheckEmailParamsDto {
  @IsAppEmail()
  email!: string;
}
