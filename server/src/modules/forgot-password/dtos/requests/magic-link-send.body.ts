// validators
import { IsAppEmail } from "@/validators/decorators";

export class ForgotPasswordMagicLinkSendBodyDto {
  @IsAppEmail()
  email!: string;
}
