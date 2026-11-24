// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toOtpSendDto` builds an object literal typed as this class. */
export class OtpSendDto {
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

export const toOtpSendDto = (
  expiresIn: number,
  cooldown: number
): OtpSendDto => ({
  success: true,
  expiresIn,
  cooldown
});
