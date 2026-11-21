// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toMagicLinkSendDto` builds an object literal typed as this class. */
export class MagicLinkSendDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;

  @ApiProperty({
    type: "integer",
    example: 900,
    description: "Magic link expiration in seconds"
  })
  expiresIn!: number;

  @ApiProperty({
    type: "integer",
    example: 60,
    description: "Cooldown before the next request, in seconds"
  })
  cooldown!: number;
}

export const toMagicLinkSendDto = (
  expiresIn: number,
  cooldown: number
): MagicLinkSendDto => ({
  success: true,
  expiresIn,
  cooldown
});
