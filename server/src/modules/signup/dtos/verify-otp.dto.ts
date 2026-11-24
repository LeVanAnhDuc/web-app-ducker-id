// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toVerifyOtpDto` builds an object literal typed as this class. */
export class VerifyOtpDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;

  @ApiProperty({
    type: "string",
    example: "a1b2c3d4e5f6...",
    description: "Session token for the complete-signup step"
  })
  sessionToken!: string;

  @ApiProperty({
    type: "integer",
    example: 1800,
    description: "Session token expiration in seconds"
  })
  expiresIn!: number;
}

export const toVerifyOtpDto = (
  sessionToken: string,
  expiresIn: number
): VerifyOtpDto => ({
  success: true,
  sessionToken,
  expiresIn
});
