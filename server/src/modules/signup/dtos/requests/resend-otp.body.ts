// validators
import { IsAppEmail } from "@/validators/decorators";

export class ResendOtpBodyDto {
  @IsAppEmail()
  email!: string;
}
