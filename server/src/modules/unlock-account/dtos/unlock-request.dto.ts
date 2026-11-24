// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toUnlockRequestDto` builds an object literal typed as this class. */
export class UnlockRequestDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;
}

export const toUnlockRequestDto = (): UnlockRequestDto => ({
  success: true
});
