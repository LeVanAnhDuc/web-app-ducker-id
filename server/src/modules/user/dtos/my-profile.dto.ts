// common
import { Expose, ExposeDate, ExposeId, ExposeOrNull } from "@/common/dto";
import { ApiProperty } from "@/common/openapi";
// modules
import { GENDERS } from "@/modules/user/constants";

/** Source: the signed-in user's record. Every profile field, `null` when unset. */
export class MyProfileDto {
  @ApiProperty({
    example: "64f1b2c3d4e5f6a7b8c9d0e1",
    description: "User ID (MongoDB ObjectId)"
  })
  @ExposeId()
  _id!: string;

  @ApiProperty({ example: "Nguyen Van A" })
  @Expose()
  fullName!: string;

  @ApiProperty({ example: "+84 912 345 678" })
  @ExposeOrNull()
  phone!: string | null;

  @ApiProperty({
    example: "http://localhost:3000/uploads/avatars/uuid.jpg",
    description: "Full URL to the avatar image, or null if not set"
  })
  @ExposeOrNull()
  avatar!: string | null;

  @ApiProperty({ example: "123 Le Loi, District 1, Ho Chi Minh City" })
  @ExposeOrNull()
  address!: string | null;

  @ApiProperty({
    type: "string",
    nullable: true,
    example: "1995-06-15T00:00:00.000Z"
  })
  @ExposeDate()
  dateOfBirth!: string | null;

  @ApiProperty({
    type: "string",
    enum: Object.values(GENDERS),
    nullable: true,
    example: GENDERS.MALE
  })
  @ExposeOrNull()
  gender!: string | null;

  @ApiProperty({
    example: "user@example.com",
    description: "The signed-in account's email"
  })
  @Expose()
  email!: string;

  @ApiProperty({ example: "2026-01-01T00:00:00.000Z" })
  @ExposeDate()
  createdAt!: string;
}
