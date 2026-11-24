// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toSendOtpResponseDto` builds an object literal typed as this class. */
export class SendOtpResponseDto {
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
    description: "Cooldown before the next request, in seconds"
  })
  cooldown!: number;
}

export const toSendOtpResponseDto = (
  expiresIn: number,
  cooldown: number
): SendOtpResponseDto => ({
  success: true,
  expiresIn,
  cooldown
});
