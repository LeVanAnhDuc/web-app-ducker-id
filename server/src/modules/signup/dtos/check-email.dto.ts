// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `toCheckEmailDto` builds an object literal typed as this class. */
export class CheckEmailDto {
  @ApiProperty({
    type: "boolean",
    example: true,
    description: "Whether the email is available for registration"
  })
  available!: boolean;
}

export const toCheckEmailDto = (available: boolean): CheckEmailDto => ({
  available
});
