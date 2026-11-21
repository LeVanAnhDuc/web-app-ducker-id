// common
import { ApiProperty } from "@/common/openapi";

/** Plain data: `adminResetPassword` returns an object literal typed as this class. Never the password or its hash. */
export class AdminResetPasswordResultDto {
  @ApiProperty({
    type: "string",
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "User ID (MongoDB ObjectId)"
  })
  _id!: string;

  @ApiProperty({
    type: "string",
    example: "user@example.com",
    description: "Email address the temporary password was sent to"
  })
  email!: string;
}
