// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `setUserActive` returns an object literal typed as this class. */
export class SetUserActiveResultDto {
  @ApiProperty({
    type: "string",
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "User ID (MongoDB ObjectId)"
  })
  _id!: string;

  @ApiProperty({
    type: "boolean",
    example: false,
    description: "False when the account is locked, true when active"
  })
  isActive!: boolean;
}
