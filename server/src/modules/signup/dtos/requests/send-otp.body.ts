// validators
import { IsAppEmail } from "@/validators/decorators";

export class SendOtpBodyDto {
  @IsAppEmail()
  email!: string;
}
