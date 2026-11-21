// validators
import { IsAppEmail } from "@/validators/decorators";

export class OtpSendBodyDto {
  @IsAppEmail()
  email!: string;
}
