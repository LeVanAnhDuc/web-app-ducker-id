// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toResendOtpDto` builds an object literal typed as this class. */
export class ResendOtpDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;

  @ApiProperty({
    type: "integer",
    example: 300,
    description: "OTP expiration in seconds"
  })
  expiresIn!: number;

  @ApiProperty({
    type: "integer",
    example: 60,
    description: "Cooldown before the next resend, in seconds"
  })
  cooldownSeconds!: number;

  @ApiProperty({
    type: "integer",
    example: 1,
    description: "Resends used in the current window"
  })
  resendCount!: number;

  @ApiProperty({
    type: "integer",
    example: 5,
    description: "Maximum resends allowed in the window"
  })
  maxResends!: number;

  @ApiProperty({
    type: "integer",
    example: 4,
    description: "maxResends minus resendCount"
  })
  remainingResends!: number;
}

export const toResendOtpDto = (
  expiresIn: number,
  cooldownSeconds: number,
  resendCount: number,
  maxResends: number
): ResendOtpDto => ({
  success: true,
  expiresIn,
  cooldownSeconds,
  resendCount,
  maxResends,
  remainingResends: maxResends - resendCount
});
