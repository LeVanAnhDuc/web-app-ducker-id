// validators
import { IsAppEmail } from "@/validators/decorators";

export class UnlockRequestBodyDto {
  @IsAppEmail()
  email!: string;
}
