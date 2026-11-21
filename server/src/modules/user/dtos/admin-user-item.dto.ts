// types
import type { AdminUserRole } from "@/modules/user/types";
// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { AUTHENTICATION_ROLES } from "@/modules/authentication/constants";

/** Source: a row of the admin users aggregation (`AdminUserAggregateRow`). */
export class AdminUserDto {
  @ApiProperty({
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "User ID (MongoDB ObjectId)"
  })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "Nguyen Van A" })
  @Expose()
  fullName!: string;

  @ApiProperty({ example: "user@example.com" })
  @Expose()
  email!: string;

  @ApiProperty({
    example: "http://localhost:3000/uploads/avatars/uuid.jpg",
    description: "Full URL to the avatar image, or null if not set"
  })
  @ExposeOrNull()
  avatar!: string | null;

  @ApiProperty({
    type: "string",
    enum: Object.values(AUTHENTICATION_ROLES),
    example: AUTHENTICATION_ROLES.USER
  })
  @Expose()
  role!: AdminUserRole;

  @ApiProperty({
    example: true,
    description: "False when the account is locked"
  })
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    type: "string",
    nullable: true,
    example: "2026-05-20T08:30:00.000Z",
    description: "Last successful sign-in, or null if the user never signed in"
  })
  @ExposeDate()
  lastLoginAt!: string | null;

  @ApiProperty({ example: "2026-01-01T00:00:00.000Z" })
  @ExposeDate()
  createdAt!: string;
}
