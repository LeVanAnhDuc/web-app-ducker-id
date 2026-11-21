// validators
import { IsAppEmail } from "@/validators/decorators";

export class ForgotPasswordOtpSendBodyDto {
  @IsAppEmail()
  email!: string;
}
