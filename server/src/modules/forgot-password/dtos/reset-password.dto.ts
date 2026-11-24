// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toResetPasswordResponseDto` builds an object literal typed as this class. */
export class ResetPasswordResponseDto {
  @ApiProperty({ type: "boolean", example: true })
  success!: boolean;
}

export const toResetPasswordResponseDto = (): ResetPasswordResponseDto => ({
  success: true
});
