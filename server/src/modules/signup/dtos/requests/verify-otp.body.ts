// validators
import { IsAppEmail, IsOtp } from "@/validators/decorators";

export class VerifyOtpBodyDto {
  @IsAppEmail()
  email!: string;

  @IsOtp()
  otp!: string;
}
