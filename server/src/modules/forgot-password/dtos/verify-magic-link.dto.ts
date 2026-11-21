// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toVerifyMagicLinkResponseDto` builds an object literal typed as this class. */
export class VerifyMagicLinkResponseDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;

  @ApiProperty({
    type: "string",
    example: "a1b2c3d4e5f6...128chars",
    description:
      "One-time reset token for /auth/forgot-password/reset (64 bytes hex, 128 chars)"
  })
  resetToken!: string;
}

export const toVerifyMagicLinkResponseDto = (
  resetToken: string
): VerifyMagicLinkResponseDto => ({
  success: true,
  resetToken
});
