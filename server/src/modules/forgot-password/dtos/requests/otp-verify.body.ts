// common
import { ApiProperty } from "@/common/openapi";
// validators
import { IsAppEmail, IsOtp } from "@/validators/decorators";

export class ForgotPasswordOtpVerifyBodyDto {
  @ApiProperty({ example: "user@example.com" })
  @IsAppEmail()
  email!: string;

  @ApiProperty({
    example: "123456",
    description: "The 6-digit code sent by email"
  })
  @IsOtp()
  otp!: string;
}
