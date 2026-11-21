// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toSendOtpDto` builds an object literal typed as this class. */
export class SendOtpDto {
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
    description: "Cooldown before the next OTP request, in seconds"
  })
  cooldownSeconds!: number;
}

export const toSendOtpDto = (
  expiresIn: number,
  cooldownSeconds: number
): SendOtpDto => ({
  success: true,
  expiresIn,
  cooldownSeconds
});
