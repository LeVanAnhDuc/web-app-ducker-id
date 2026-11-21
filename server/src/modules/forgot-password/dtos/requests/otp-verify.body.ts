// validators
import { IsAppEmail, IsOtp } from "@/validators/decorators";

export class OtpVerifyBodyDto {
  @IsAppEmail()
  email!: string;

  @IsOtp()
  otp!: string;
}
