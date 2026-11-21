// validators
import { IsAppEmail, IsOtp } from "@/validators/decorators";

export class ForgotPasswordOtpVerifyBodyDto {
  @IsAppEmail()
  email!: string;

  @IsOtp()
  otp!: string;
}
